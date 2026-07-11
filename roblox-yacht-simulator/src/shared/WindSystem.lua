local WindSystem = {}
WindSystem.__index = WindSystem

function WindSystem.new()
	local self = setmetatable({}, WindSystem)
	self.baseDirection = Vector3.new(1, 0, 0)
	self.baseSpeed = 10
	self.currentDirection = self.baseDirection
	self.currentSpeed = self.baseSpeed
	self.gustTimer = 0
	self.shiftTimer = 0
	self.gustInterval = 15
	self.shiftInterval = 60
	self.gustStrength = 0
	self.localVariations = {}
	return self
end

function WindSystem:update(dt: number)
	self.gustTimer = self.gustTimer + dt
	self.shiftTimer = self.shiftTimer + dt

	if self.gustTimer >= self.gustInterval then
		self.gustTimer = 0
		self.gustStrength = (math.random() - 0.3) * 5
		self.gustInterval = 10 + math.random() * 20
	end

	self.gustStrength = self.gustStrength * 0.98

	if self.shiftTimer >= self.shiftInterval then
		self.shiftTimer = 0
		local shiftAngle = math.rad((math.random() - 0.5) * 30)
		local cos = math.cos(shiftAngle)
		local sin = math.sin(shiftAngle)
		self.baseDirection = Vector3.new(
			self.baseDirection.X * cos - self.baseDirection.Z * sin,
			0,
			self.baseDirection.X * sin + self.baseDirection.Z * cos
		).Unit
		self.shiftInterval = 30 + math.random() * 90
	end

	self.currentSpeed = math.max(1, self.baseSpeed + self.gustStrength)
	self.currentDirection = self.baseDirection
end

function WindSystem:getWindAtPosition(position: Vector3): (Vector3, number)
	local localShift = math.sin(position.X * 0.001) * math.cos(position.Z * 0.001) * 0.1
	local localDir = Vector3.new(
		self.currentDirection.X + localShift,
		0,
		self.currentDirection.Z + localShift * 0.5
	).Unit

	local localSpeedVar = 1 + math.sin(position.X * 0.002 + position.Z * 0.003) * 0.15
	local localSpeed = self.currentSpeed * localSpeedVar

	return localDir, localSpeed
end

function WindSystem:setWeather(weatherName: string)
	local Config = require(script.Parent.Config)
	local weather = Config.Weather[weatherName]
	if not weather then
		return
	end

	self.baseSpeed = 10 * weather.windMultiplier
	self.gustInterval = 15 / weather.windMultiplier
end

function WindSystem:getDirection(): Vector3
	return self.currentDirection
end

function WindSystem:getSpeed(): number
	return self.currentSpeed
end

return WindSystem
