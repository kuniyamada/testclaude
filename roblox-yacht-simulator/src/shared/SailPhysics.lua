local SailPhysics = {}
SailPhysics.__index = SailPhysics

local Config = require(game:GetService("ReplicatedStorage").Config)

function SailPhysics.new()
	local self = setmetatable({}, SailPhysics)
	self.windDirection = Vector3.new(1, 0, 0)
	self.windSpeed = 10
	return self
end

function SailPhysics:calculateApparentWind(boatVelocity: Vector3): (Vector3, number)
	local trueWind = self.windDirection * self.windSpeed
	local apparentWind = trueWind - boatVelocity
	local mag = apparentWind.Magnitude
	if mag < 0.001 then
		return Vector3.zero, 0
	end
	return apparentWind.Unit, mag
end

function SailPhysics:getWindAngle(boatHeading: Vector3): number
	return math.deg(math.acos(math.clamp(self.windDirection:Dot(boatHeading), -1, 1)))
end

function SailPhysics:calculateSailForce(
	boatHeading: Vector3,
	boatVelocity: Vector3,
	sailAngle: number,
	boatConfig: { [string]: any }
): Vector3
	local apparentWindDir, apparentWindSpeed = self:calculateApparentWind(boatVelocity)

	if apparentWindSpeed < 0.01 then
		return Vector3.zero
	end

	local windAngle = math.deg(math.acos(math.clamp(apparentWindDir:Dot(boatHeading), -1, 1)))

	local physics = Config.Physics

	-- デッドゾーン: 風上約35度以内はほぼ進めない
	if windAngle < 35 then
		local deadZoneFactor = math.max(0, (windAngle - 15) / 20)
		local tinyForce = deadZoneFactor * 0.1 * apparentWindSpeed * (boatConfig.maxSpeed / 60)
		return boatHeading * tinyForce
	end

	local sailNormal = CFrame.Angles(0, math.rad(sailAngle), 0) * boatHeading
	local angleOfAttack = math.acos(math.clamp(apparentWindDir:Dot(sailNormal), -1, 1))

	local liftMagnitude = 0
	local dragMagnitude = 0

	if angleOfAttack > math.rad(15) and angleOfAttack < math.rad(165) then
		liftMagnitude = physics.liftCoefficient
			* physics.airDensity
			* apparentWindSpeed ^ 2
			* math.sin(2 * angleOfAttack)
			* 0.5

		dragMagnitude = physics.dragCoefficient * physics.airDensity * apparentWindSpeed ^ 2 * 0.5
	end

	local liftDirection = apparentWindDir:Cross(Vector3.new(0, 1, 0))
	if liftDirection.Magnitude > 0.001 then
		liftDirection = liftDirection.Unit
	else
		liftDirection = Vector3.zero
	end

	local totalAeroForce = liftDirection * liftMagnitude + apparentWindDir * dragMagnitude

	-- キール/センターボード効果: 力を船首方向に変換し、横方向は大部分を抵抗
	local forwardComponent = totalAeroForce:Dot(boatHeading)
	local lateralComponent = totalAeroForce - boatHeading * forwardComponent

	-- 横方向の力の95%はキールが抵抗する（残り5%が横流れ leeway）
	local keelResistance = 0.95
	local effectiveForce = boatHeading * forwardComponent + lateralComponent * (1 - keelResistance)

	-- 後進は大幅に制限（実際のヨットは後ろにほぼ進まない）
	local finalForward = effectiveForce:Dot(boatHeading)
	if finalForward < 0 then
		effectiveForce = effectiveForce - boatHeading * finalForward * 0.9
	end

	-- 風角度による効率カーブ（クローズホールド〜ランニング）
	local efficiency = 1.0
	if windAngle < 50 then
		efficiency = 0.5 + (windAngle - 35) / 15 * 0.5
	elseif windAngle > 150 then
		-- ランニング（追い風）は効率が少し下がる
		efficiency = 0.7 + (180 - windAngle) / 30 * 0.3
	end

	return effectiveForce * efficiency * (boatConfig.maxSpeed / 60)
end

function SailPhysics:calculateWaterResistance(velocity: Vector3, boatConfig: { [string]: any }): Vector3
	local speed = velocity.Magnitude
	if speed < 0.01 then
		return Vector3.zero
	end

	local dragForce = Config.Physics.dragCoefficient
		* Config.Physics.waterDensity
		* speed ^ 2
		* 0.5
		/ boatConfig.maxSpeed

	return -velocity.Unit * dragForce
end

function SailPhysics:calculateHeel(
	sailForce: Vector3,
	boatHeading: Vector3,
	boatConfig: { [string]: any }
): number
	local lateralForce = sailForce - boatHeading * sailForce:Dot(boatHeading)
	local crossDir = boatHeading:Cross(Vector3.new(0, 1, 0))
	local heelSign = 1
	if crossDir.Magnitude > 0.001 then
		heelSign = lateralForce:Dot(crossDir) > 0 and 1 or -1
	end
	local heelAngle = math.deg(math.atan2(lateralForce.Magnitude, Config.Physics.gravity * boatConfig.stability * 100))
	return math.clamp(heelAngle * heelSign, -90, 90)
end

function SailPhysics:calculateOptimalSailAngle(boatHeading: Vector3, boatVelocity: Vector3): number
	local apparentWindDir = self:calculateApparentWind(boatVelocity)
	local windAngle = math.deg(math.acos(math.clamp(apparentWindDir:Dot(boatHeading), -1, 1)))

	if windAngle < 45 then
		return windAngle * 0.5
	elseif windAngle < 90 then
		return 20 + (windAngle - 45) * 0.6
	elseif windAngle < 135 then
		return 50 + (windAngle - 90) * 0.4
	else
		return 70 + (windAngle - 135) * 0.2
	end
end

function SailPhysics:isInIrons(boatHeading: Vector3, boatVelocity: Vector3): boolean
	local apparentWindDir = self:calculateApparentWind(boatVelocity)
	local angle = math.deg(math.acos(math.clamp(apparentWindDir:Dot(boatHeading), -1, 1)))
	return angle < 35
end

function SailPhysics:calculateWaveEffect(position: Vector3, time: number, weather: { [string]: any }): Vector3
	local waveHeight = weather.waveHeight
	local frequency = 0.1
	local y = waveHeight * math.sin(position.X * frequency + time) * math.cos(position.Z * frequency * 0.7 + time * 1.3)
	return Vector3.new(0, y, 0)
end

function SailPhysics:setWind(direction: Vector3, speed: number)
	self.windDirection = direction.Unit
	self.windSpeed = speed
end

function SailPhysics:shiftWind(maxShiftDegrees: number)
	local shiftAngle = math.rad((math.random() - 0.5) * 2 * maxShiftDegrees)
	local cos = math.cos(shiftAngle)
	local sin = math.sin(shiftAngle)
	local oldDir = self.windDirection
	self.windDirection = Vector3.new(
		oldDir.X * cos - oldDir.Z * sin,
		0,
		oldDir.X * sin + oldDir.Z * cos
	).Unit

	self.windSpeed = math.clamp(self.windSpeed + (math.random() - 0.5) * 2, 3, 30)
end

return SailPhysics
