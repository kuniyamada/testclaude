local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local camera = workspace.CurrentCamera

local CameraController = {}

local cameraMode = "chase"
local cameraOffset = Vector3.new(0, 8, 20)
local lookAhead = 10
local smoothness = 5
local fovBase = 70
local fovSpeedBonus = 0.3

local freeCamYaw = 0
local freeCamPitch = -20
local freeCamDistance = 25

local boatPosition = Vector3.zero
local boatHeading = Vector3.new(0, 0, -1)
local boatSpeed = 0
local boatHeelAngle = 0

local function lerpVector3(a, b, t)
	return a + (b - a) * math.clamp(t, 0, 1)
end

local function updateChaseCamera(dt)
	local targetPos = boatPosition
		- boatHeading * cameraOffset.Z
		+ Vector3.new(0, cameraOffset.Y, 0)
		+ boatHeading * lookAhead * (boatSpeed / 60)

	local heelOffset = Vector3.new(0, 0, 0)
	if math.abs(boatHeelAngle) > 5 then
		local side = boatHeading:Cross(Vector3.new(0, 1, 0))
		heelOffset = side * math.sin(math.rad(boatHeelAngle)) * 3
	end

	targetPos = targetPos + heelOffset

	local currentPos = camera.CFrame.Position
	local smoothedPos = lerpVector3(currentPos, targetPos, dt * smoothness)

	local lookAt = boatPosition + boatHeading * lookAhead
	camera.CFrame = CFrame.lookAt(smoothedPos, lookAt)
	camera.FieldOfView = fovBase + boatSpeed * fovSpeedBonus
end

local function updateFreeCamera(dt)
	local yawRad = math.rad(freeCamYaw)
	local pitchRad = math.rad(freeCamPitch)

	local offset = Vector3.new(
		math.sin(yawRad) * math.cos(pitchRad) * freeCamDistance,
		math.sin(pitchRad) * freeCamDistance,
		math.cos(yawRad) * math.cos(pitchRad) * freeCamDistance
	)

	local targetPos = boatPosition + offset
	local currentPos = camera.CFrame.Position
	local smoothedPos = lerpVector3(currentPos, targetPos, dt * smoothness)

	camera.CFrame = CFrame.lookAt(smoothedPos, boatPosition)
	camera.FieldOfView = fovBase
end

local function updateTopDownCamera(dt)
	local targetPos = boatPosition + Vector3.new(0, 80, 0)
	local currentPos = camera.CFrame.Position
	local smoothedPos = lerpVector3(currentPos, targetPos, dt * smoothness * 0.5)

	camera.CFrame = CFrame.lookAt(smoothedPos, boatPosition)
	camera.FieldOfView = 50
end

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then
		return
	end

	if input.KeyCode == Enum.KeyCode.V then
		if cameraMode == "chase" then
			cameraMode = "free"
		elseif cameraMode == "free" then
			cameraMode = "topdown"
		else
			cameraMode = "chase"
		end
	end
end)

UserInputService.InputChanged:Connect(function(input, gameProcessed)
	if cameraMode ~= "free" then
		return
	end

	if input.UserInputType == Enum.UserInputType.MouseMovement then
		if UserInputService:IsMouseButtonPressed(Enum.UserInputType.MouseButton2) then
			freeCamYaw = freeCamYaw - input.Delta.X * 0.5
			freeCamPitch = math.clamp(freeCamPitch - input.Delta.Y * 0.5, -80, -5)
		end
	end

	if input.UserInputType == Enum.UserInputType.MouseWheel then
		freeCamDistance = math.clamp(freeCamDistance - input.Position.Z * 3, 5, 100)
	end
end)

RunService.RenderStepped:Connect(function(dt)
	camera.CameraType = Enum.CameraType.Scriptable

	if cameraMode == "chase" then
		updateChaseCamera(dt)
	elseif cameraMode == "free" then
		updateFreeCamera(dt)
	elseif cameraMode == "topdown" then
		updateTopDownCamera(dt)
	end
end)

function CameraController.setBoatState(position, heading, speed, heelAngle)
	boatPosition = position
	boatHeading = heading
	boatSpeed = speed
	boatHeelAngle = heelAngle
end

function CameraController.setMode(mode)
	cameraMode = mode
end

print("[YachtRaceSimulator] CameraController initialized")
