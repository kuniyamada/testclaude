local BoatController = {}
BoatController.__index = BoatController

local Config = require(script.Parent.Config)
local SailPhysics = require(script.Parent.SailPhysics)

function BoatController.new(boatType: string, mode: string)
	local boatConfig = Config.Boats[boatType]
	local modeConfig = Config.Modes[mode]
	assert(boatConfig, "Unknown boat type: " .. boatType)
	assert(modeConfig, "Unknown mode: " .. mode)

	local self = setmetatable({}, BoatController)
	self.boatType = boatType
	self.boatConfig = boatConfig
	self.mode = mode
	self.modeConfig = modeConfig
	self.physics = SailPhysics.new()

	self.position = Vector3.zero
	self.heading = Vector3.new(0, 0, -1)
	self.velocity = Vector3.zero
	self.speed = 0

	self.rudderAngle = 0
	self.mainSailAngle = 0
	self.jibAngle = 0
	self.heelAngle = 0

	self.isTacking = false
	self.isJibing = false
	self.tackTimer = 0
	self.capsized = false

	return self
end

function BoatController:steer(input: number, dt: number)
	local turnRate = self.boatConfig.turnRate
	if self.isTacking or self.isJibing then
		turnRate = turnRate * 0.3
	end

	self.rudderAngle = math.clamp(input * 45, -45, 45)
	local turnAmount = math.rad(self.rudderAngle * turnRate * dt)

	local cos = math.cos(turnAmount)
	local sin = math.sin(turnAmount)
	self.heading = Vector3.new(
		self.heading.X * cos - self.heading.Z * sin,
		0,
		self.heading.X * sin + self.heading.Z * cos
	).Unit
end

function BoatController:setSailAngle(angle: number)
	if self.modeConfig.autoSail then
		self.mainSailAngle = self.physics:calculateOptimalSailAngle(self.heading, self.velocity)
		return
	end
	self.mainSailAngle = math.clamp(angle, -90, 90)
end

function BoatController:setJibAngle(angle: number)
	if not self.modeConfig.enableJib then
		return
	end
	self.jibAngle = math.clamp(angle, -45, 45)
end

function BoatController:startTack()
	if self.isTacking or self.isJibing then
		return false
	end
	self.isTacking = true
	self.tackTimer = Config.Physics.tackingDuration
	return true
end

function BoatController:startJibe()
	if self.isTacking or self.isJibing then
		return false
	end
	self.isJibing = true
	self.tackTimer = Config.Physics.jibingDuration
	return true
end

function BoatController:update(dt: number, weather: { [string]: any })
	if self.capsized then
		return
	end

	if self.modeConfig.autoSail then
		self.mainSailAngle = self.physics:calculateOptimalSailAngle(self.heading, self.velocity)
	end

	if self.tackTimer > 0 then
		self.tackTimer = self.tackTimer - dt
		if self.tackTimer <= 0 then
			self.isTacking = false
			self.isJibing = false
			self.tackTimer = 0
		end
	end

	local sailForce = self.physics:calculateSailForce(self.heading, self.velocity, self.mainSailAngle, self.boatConfig)
	local waterResistance = self.physics:calculateWaterResistance(self.velocity, self.boatConfig)

	if self.isTacking then
		sailForce = sailForce * (1 - Config.Physics.tackingPenalty)
	elseif self.isJibing then
		sailForce = sailForce * (1 - Config.Physics.jibingPenalty)
	end

	local totalForce = sailForce + waterResistance
	self.velocity = self.velocity + totalForce * dt
	self.speed = self.velocity.Magnitude

	local maxSpeed = self.boatConfig.maxSpeed * weather.windMultiplier
	if self.speed > maxSpeed then
		self.velocity = self.velocity.Unit * maxSpeed
		self.speed = maxSpeed
	end

	local waveEffect = self.physics:calculateWaveEffect(self.position, tick(), weather)
	self.position = self.position + self.velocity * dt + waveEffect * dt

	self.heelAngle = self.physics:calculateHeel(sailForce, self.heading, self.boatConfig)

	if self.modeConfig.capsizeProtection then
		self.heelAngle = math.clamp(self.heelAngle, -self.modeConfig.heelLimit, self.modeConfig.heelLimit)
	elseif math.abs(self.heelAngle) > self.modeConfig.heelLimit then
		self.capsized = true
	end
end

function BoatController:recover()
	self.capsized = false
	self.velocity = Vector3.zero
	self.speed = 0
	self.heelAngle = 0
	self.rudderAngle = 0
	self.mainSailAngle = 0
	self.jibAngle = 0
end

function BoatController:getState(): { [string]: any }
	return {
		position = self.position,
		heading = self.heading,
		velocity = self.velocity,
		speed = self.speed,
		rudderAngle = self.rudderAngle,
		mainSailAngle = self.mainSailAngle,
		jibAngle = self.jibAngle,
		heelAngle = self.heelAngle,
		isTacking = self.isTacking,
		isJibing = self.isJibing,
		capsized = self.capsized,
		boatType = self.boatType,
		mode = self.mode,
	}
end

return BoatController
