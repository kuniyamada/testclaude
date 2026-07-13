local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local Config = require(ReplicatedStorage.Config)
local BoatController = require(ReplicatedStorage.BoatController)
local SailPhysics = require(ReplicatedStorage.SailPhysics)
local BoatState = require(ReplicatedStorage.BoatState)

local player = Players.LocalPlayer
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local BoatInputEvent = remotes:WaitForChild("BoatInput")
local RaceUpdateEvent = remotes:WaitForChild("RaceUpdate")
local WindUpdateEvent = remotes:WaitForChild("WindUpdate")

local boat = nil
local boatModel = nil
local steerInput = 0
local sailInput = 0
local currentMode = "Kids"
local currentBoatType = "Dinghy"
local currentWeather = Config.Weather.Clear
local windDirection = Vector3.new(1, 0, 0)
local windSpeed = 10

local keybinds = {
	steerLeft = { Enum.KeyCode.A, Enum.KeyCode.Left },
	steerRight = { Enum.KeyCode.D, Enum.KeyCode.Right },
	sailIn = { Enum.KeyCode.W, Enum.KeyCode.Up },
	sailOut = { Enum.KeyCode.S, Enum.KeyCode.Down },
	tack = { Enum.KeyCode.Q },
	jibe = { Enum.KeyCode.E },
	recover = { Enum.KeyCode.R },
}

local activeKeys = {}

local function isKeyInList(keyCode, keyList)
	for _, key in ipairs(keyList) do
		if key == keyCode then
			return true
		end
	end
	return false
end

local function findBoatModel()
	local model = Workspace:FindFirstChild("Sail Boat")
	if model then
		return model
	end
	for _, child in ipairs(Workspace:GetDescendants()) do
		if child:IsA("Model") and child.Name == "Sail Boat" then
			return child
		end
	end
	return nil
end

local function seatPlayer()
	local character = player.Character or player.CharacterAdded:Wait()
	local humanoid = character:FindFirstChildWhichIsA("Humanoid")
	if not humanoid or not boatModel then
		return
	end

	for _, desc in ipairs(boatModel:GetDescendants()) do
		if desc:IsA("Seat") or desc:IsA("VehicleSeat") then
			desc:Sit(humanoid)
			return
		end
	end
end

local function updateBoatModel()
	if not boatModel or not boatModel.PrimaryPart then
		return
	end

	local pos = boat.position
	local heading = boat.heading
	local heelAngle = boat.heelAngle

	local lookAt = pos + heading
	local baseCF = CFrame.lookAt(pos, lookAt)
	local heelCF = baseCF * CFrame.Angles(0, 0, math.rad(heelAngle))

	boatModel:PivotTo(heelCF)
end

local function initBoat(boatType, mode)
	currentBoatType = boatType
	currentMode = mode
	boat = BoatController.new(boatType, mode)

	boatModel = findBoatModel()
	if boatModel and boatModel.PrimaryPart then
		local cf = boatModel.PrimaryPart.CFrame
		boat.position = cf.Position
		boat.heading = cf.LookVector
	end

	seatPlayer()
end

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then
		return
	end

	if input.UserInputType == Enum.UserInputType.Keyboard then
		activeKeys[input.KeyCode] = true

		if boat then
			if isKeyInList(input.KeyCode, keybinds.tack) then
				boat:startTack()
			elseif isKeyInList(input.KeyCode, keybinds.jibe) then
				boat:startJibe()
			elseif isKeyInList(input.KeyCode, keybinds.recover) then
				if boat.capsized then
					boat:recover()
				end
			end
		end
	end
end)

UserInputService.InputEnded:Connect(function(input, gameProcessed)
	if input.UserInputType == Enum.UserInputType.Keyboard then
		activeKeys[input.KeyCode] = nil
	end
end)

local function processInput()
	steerInput = 0
	sailInput = 0

	for _, key in ipairs(keybinds.steerLeft) do
		if activeKeys[key] then
			steerInput = steerInput - 1
			break
		end
	end

	for _, key in ipairs(keybinds.steerRight) do
		if activeKeys[key] then
			steerInput = steerInput + 1
			break
		end
	end

	for _, key in ipairs(keybinds.sailIn) do
		if activeKeys[key] then
			sailInput = sailInput - 1
			break
		end
	end

	for _, key in ipairs(keybinds.sailOut) do
		if activeKeys[key] then
			sailInput = sailInput + 1
			break
		end
	end
end

local function processTouchInput()
	if not UserInputService.TouchEnabled then
		return
	end

	local touches = UserInputService:GetTouchesForService()
	if #touches == 0 then
		return
	end

	local screenSize = workspace.CurrentCamera.ViewportSize
	local touch = touches[1]

	local relX = (touch.Position.X / screenSize.X - 0.5) * 2
	steerInput = relX
end

local UPDATE_RATE = 1 / 30
local updateTimer = 0

RunService.RenderStepped:Connect(function(dt)
	if not boat then
		return
	end

	processInput()

	if UserInputService.TouchEnabled then
		processTouchInput()
	end

	boat:steer(steerInput, dt)

	if not boat.modeConfig.autoSail then
		local currentSail = boat.mainSailAngle
		boat:setSailAngle(currentSail + sailInput * 60 * dt)
	end

	boat.physics:setWind(windDirection, windSpeed)
	boat:update(dt, currentWeather)

	updateBoatModel()

	BoatState.speed = boat.speed
	BoatState.heading = boat.heading
	BoatState.sailAngle = boat.mainSailAngle
	BoatState.heelAngle = boat.heelAngle
	BoatState.rudderAngle = boat.rudderAngle
	BoatState.isTacking = boat.isTacking
	BoatState.isJibing = boat.isJibing
	BoatState.capsized = boat.capsized
	BoatState.windDirection = windDirection
	BoatState.windSpeed = windSpeed
	BoatState.position = boat.position

	updateTimer = updateTimer + dt
	if updateTimer >= UPDATE_RATE then
		updateTimer = 0
		BoatInputEvent:FireServer({
			position = boat.position,
			heading = boat.heading,
			state = boat:getState(),
		})
	end
end)

RaceUpdateEvent.OnClientEvent:Connect(function(data)
	windDirection = data.windDirection or windDirection
	windSpeed = data.windSpeed or windSpeed
	if data.weather and Config.Weather[data.weather] then
		currentWeather = Config.Weather[data.weather]
	end
end)

remotes:WaitForChild("JoinRace").OnClientEvent:Connect(function(data)
	if data.success then
		initBoat(currentBoatType, currentMode)
	end
end)

remotes:WaitForChild("StartRace").OnClientEvent:Connect(function(data)
	if data.state == "started" and boat then
		boat.position = data.position or boat.position
	end
end)

local function setMode(mode)
	currentMode = mode
	remotes.SelectMode:FireServer({ mode = mode })
	if boat then
		initBoat(currentBoatType, mode)
	end
end

local function setBoat(boatType)
	currentBoatType = boatType
	remotes.SelectBoat:FireServer({ boatType = boatType })
	if boat then
		initBoat(boatType, currentMode)
	end
end

initBoat("Dinghy", "Kids")

print("[YachtRaceSimulator] BoatInput initialized")
