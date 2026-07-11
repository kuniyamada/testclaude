local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Lighting = game:GetService("Lighting")

local Config = require(ReplicatedStorage.Config)

local WeatherController = {}

local currentWeather = "Clear"
local weatherChangeInterval = 300
local weatherTimer = 0

local WeatherUpdateEvent = Instance.new("RemoteEvent")
WeatherUpdateEvent.Name = "WeatherUpdate"
WeatherUpdateEvent.Parent = ReplicatedStorage:WaitForChild("Remotes")

local weatherSequence = { "Clear", "Cloudy", "Clear", "Sunset", "Night", "Clear", "Rain", "Cloudy", "Clear" }
local sequenceIndex = 1

local weatherSettings = {
	Clear = { brightness = 2, ambient = Color3.fromRGB(135, 206, 235), clockTime = 14, fogEnd = 10000 },
	Cloudy = { brightness = 1.5, ambient = Color3.fromRGB(160, 160, 170), clockTime = 12, fogEnd = 5000 },
	Sunset = { brightness = 1.8, ambient = Color3.fromRGB(255, 140, 50), clockTime = 18, fogEnd = 8000 },
	Night = { brightness = 0.5, ambient = Color3.fromRGB(30, 30, 60), clockTime = 22, fogEnd = 3000 },
	Rain = { brightness = 1.0, ambient = Color3.fromRGB(100, 100, 120), clockTime = 14, fogEnd = 2000 },
	Storm = { brightness = 0.8, ambient = Color3.fromRGB(80, 80, 100), clockTime = 14, fogEnd = 1000 },
	Typhoon = { brightness = 0.5, ambient = Color3.fromRGB(60, 60, 80), clockTime = 14, fogEnd = 500 },
}

function WeatherController.setWeather(weatherName: string)
	if not Config.Weather[weatherName] then
		return
	end

	currentWeather = weatherName
	local settings = weatherSettings[weatherName]

	if settings then
		Lighting.Brightness = settings.brightness
		Lighting.Ambient = settings.ambient
		Lighting.ClockTime = settings.clockTime
		Lighting.FogEnd = settings.fogEnd
	end

	WeatherUpdateEvent:FireAllClients({
		weather = weatherName,
		config = Config.Weather[weatherName],
	})
end

function WeatherController.update(dt: number)
	weatherTimer = weatherTimer + dt

	if weatherTimer >= weatherChangeInterval then
		weatherTimer = 0
		sequenceIndex = sequenceIndex % #weatherSequence + 1
		WeatherController.setWeather(weatherSequence[sequenceIndex])
	end
end

WeatherController.setWeather("Clear")

game:GetService("RunService").Heartbeat:Connect(function(dt)
	WeatherController.update(dt)
end)

print("[YachtRaceSimulator] WeatherController initialized")
