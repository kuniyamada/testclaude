local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")
local Lighting = game:GetService("Lighting")

local Config = require(ReplicatedStorage.Config)

local EnvironmentEffects = {}

local currentWeather = "Clear"
local waterParts = {}
local wildlifeModels = {}

local function createWaterPlane()
	local water = Instance.new("Part")
	water.Name = "Ocean"
	water.Size = Vector3.new(10000, 1, 10000)
	water.Position = Vector3.new(0, -0.5, 0)
	water.Anchored = true
	water.CanCollide = false
	water.Material = Enum.Material.Water
	water.Color = Color3.fromRGB(30, 100, 180)
	water.Transparency = 0.3
	water.Parent = Workspace

	table.insert(waterParts, water)
	return water
end

local function createSkybox()
	local sky = Instance.new("Sky")
	sky.Name = "OceanSky"
	sky.SunAngularSize = 15
	sky.MoonAngularSize = 10
	sky.StarCount = 3000
	sky.CelestialBodiesShown = true
	sky.Parent = Lighting
	return sky
end

local function createAtmosphere()
	local atm = Instance.new("Atmosphere")
	atm.Name = "OceanAtmosphere"
	atm.Density = 0.3
	atm.Offset = 0.25
	atm.Color = Color3.fromRGB(199, 220, 255)
	atm.Decay = Color3.fromRGB(92, 120, 176)
	atm.Glare = 0.5
	atm.Haze = 2
	atm.Parent = Lighting
	return atm
end

local function createBuoy(position, index, rounding)
	local buoy = Instance.new("Part")
	buoy.Name = "Buoy_" .. index
	buoy.Shape = Enum.PartType.Cylinder
	buoy.Size = Vector3.new(3, 6, 6)
	buoy.Position = position + Vector3.new(0, 2, 0)
	buoy.Anchored = true
	buoy.CanCollide = true
	buoy.Material = Enum.Material.SmoothPlastic

	if rounding == "port" then
		buoy.Color = Color3.fromRGB(255, 50, 50)
	else
		buoy.Color = Color3.fromRGB(50, 200, 50)
	end

	buoy.Orientation = Vector3.new(0, 0, 90)
	buoy.Parent = Workspace

	local label = Instance.new("BillboardGui")
	label.Size = UDim2.new(0, 60, 0, 30)
	label.StudsOffset = Vector3.new(0, 5, 0)
	label.AlwaysOnTop = true
	label.Parent = buoy

	local text = Instance.new("TextLabel")
	text.Size = UDim2.new(1, 0, 1, 0)
	text.BackgroundTransparency = 1
	text.Text = tostring(index)
	text.TextColor3 = Color3.fromRGB(255, 255, 255)
	text.TextScaled = true
	text.Font = Enum.Font.GothamBold
	text.Parent = label

	return buoy
end

local function createStartFinishLine(position, width)
	local line = Instance.new("Part")
	line.Name = "StartFinishLine"
	line.Size = Vector3.new(width, 0.5, 3)
	line.Position = position + Vector3.new(0, 0.5, 0)
	line.Anchored = true
	line.CanCollide = false
	line.Material = Enum.Material.Neon
	line.Color = Color3.fromRGB(255, 255, 0)
	line.Transparency = 0.3
	line.Parent = Workspace

	local leftPole = Instance.new("Part")
	leftPole.Name = "StartPole_Left"
	leftPole.Size = Vector3.new(2, 15, 2)
	leftPole.Position = position + Vector3.new(-width / 2, 7.5, 0)
	leftPole.Anchored = true
	leftPole.Material = Enum.Material.Metal
	leftPole.Color = Color3.fromRGB(200, 50, 50)
	leftPole.Parent = Workspace

	local rightPole = Instance.new("Part")
	rightPole.Name = "StartPole_Right"
	rightPole.Size = Vector3.new(2, 15, 2)
	rightPole.Position = position + Vector3.new(width / 2, 7.5, 0)
	rightPole.Anchored = true
	rightPole.Material = Enum.Material.Metal
	rightPole.Color = Color3.fromRGB(200, 50, 50)
	rightPole.Parent = Workspace

	return line
end

local function createLighthouse(position)
	local base = Instance.new("Part")
	base.Name = "Lighthouse"
	base.Shape = Enum.PartType.Cylinder
	base.Size = Vector3.new(30, 8, 8)
	base.Position = position + Vector3.new(0, 15, 0)
	base.Anchored = true
	base.Material = Enum.Material.Concrete
	base.Color = Color3.fromRGB(240, 240, 240)
	base.Orientation = Vector3.new(0, 0, 0)
	base.Parent = Workspace

	local light = Instance.new("SpotLight")
	light.Name = "BeaconLight"
	light.Brightness = 5
	light.Range = 200
	light.Angle = 30
	light.Color = Color3.fromRGB(255, 255, 200)
	light.Parent = base

	return base
end

local function createIsland(position, size)
	local island = Instance.new("Part")
	island.Name = "Island"
	island.Shape = Enum.PartType.Ball
	island.Size = Vector3.new(size, size * 0.3, size)
	island.Position = position + Vector3.new(0, -size * 0.1, 0)
	island.Anchored = true
	island.Material = Enum.Material.Sand
	island.Color = Color3.fromRGB(194, 178, 128)
	island.Parent = Workspace
	return island
end

local function setupCourseEnvironment()
	local CourseManager = require(ReplicatedStorage.CourseManager)
	local course = CourseManager.new("Enoshima")

	for _, buoy in ipairs(course.buoys) do
		createBuoy(buoy.position, buoy.index, buoy.rounding)
	end

	createStartFinishLine(course.startLine.position, course.startLine.width)
	createLighthouse(Vector3.new(-500, 0, -200))
	createLighthouse(Vector3.new(600, 0, 400))
	createIsland(Vector3.new(-800, 0, -600), 200)
	createIsland(Vector3.new(900, 0, 700), 150)
	createIsland(Vector3.new(-300, 0, 800), 100)
end

local function animateWater(dt)
	local time = tick()
	for _, water in ipairs(waterParts) do
		local weatherConfig = Config.Weather[currentWeather]
		if weatherConfig then
			local waveScale = weatherConfig.waveHeight
			water.Position = Vector3.new(0, -0.5 + math.sin(time * 0.5) * waveScale * 0.3, 0)

			local baseColor = Color3.fromRGB(30, 100, 180)
			if currentWeather == "Night" then
				baseColor = Color3.fromRGB(10, 30, 60)
			elseif currentWeather == "Sunset" then
				baseColor = Color3.fromRGB(60, 80, 140)
			elseif currentWeather == "Storm" or currentWeather == "Typhoon" then
				baseColor = Color3.fromRGB(30, 60, 90)
			end
			water.Color = baseColor
		end
	end
end

local function createRainEffect()
	local emitter = Instance.new("ParticleEmitter")
	emitter.Name = "Rain"
	emitter.Rate = 500
	emitter.Lifetime = NumberRange.new(1, 2)
	emitter.Speed = NumberRange.new(50, 80)
	emitter.SpreadAngle = Vector2.new(5, 5)
	emitter.Color = ColorSequence.new(Color3.fromRGB(180, 200, 255))
	emitter.Size = NumberSequence.new(0.1)
	emitter.Transparency = NumberSequence.new(0.3)
	emitter.Enabled = false

	local rainPart = Instance.new("Part")
	rainPart.Name = "RainEmitter"
	rainPart.Size = Vector3.new(200, 1, 200)
	rainPart.Position = Vector3.new(0, 100, 0)
	rainPart.Anchored = true
	rainPart.CanCollide = false
	rainPart.Transparency = 1
	rainPart.Parent = Workspace

	emitter.Parent = rainPart
	return emitter
end

local rainEmitter = createRainEffect()

local remotes = ReplicatedStorage:WaitForChild("Remotes")
remotes:WaitForChild("WeatherUpdate").OnClientEvent:Connect(function(data)
	currentWeather = data.weather

	local showRain = currentWeather == "Rain" or currentWeather == "Storm" or currentWeather == "Typhoon"
	rainEmitter.Enabled = showRain

	if showRain then
		local rates = { Rain = 300, Storm = 800, Typhoon = 1500 }
		rainEmitter.Rate = rates[currentWeather] or 300
	end
end)

createWaterPlane()
createSkybox()
createAtmosphere()
setupCourseEnvironment()

RunService.RenderStepped:Connect(function(dt)
	animateWater(dt)
end)

print("[YachtRaceSimulator] EnvironmentEffects initialized")
