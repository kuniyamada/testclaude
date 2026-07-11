local CourseManager = {}
CourseManager.__index = CourseManager

local Config = require(script.Parent.Config)

function CourseManager.new(courseName: string)
	local courseConfig = Config.Courses[courseName]
	assert(courseConfig, "Unknown course: " .. courseName)

	local self = setmetatable({}, CourseManager)
	self.courseName = courseName
	self.config = courseConfig
	self.buoys = {}
	self.startLine = { position = Vector3.zero, direction = Vector3.new(1, 0, 0), width = 100 }
	self.finishLine = { position = Vector3.zero, direction = Vector3.new(1, 0, 0), width = 100 }

	self:generateBuoys()
	return self
end

function CourseManager:generateBuoys()
	local numBuoys = self.config.buoys
	local basePos = self.config.position
	local courseRadius = 300 + self.config.difficulty * 100

	self.startLine.position = basePos + Vector3.new(0, 0, courseRadius + 50)
	self.finishLine.position = basePos + Vector3.new(0, 0, courseRadius + 50)

	for i = 1, numBuoys do
		local angle = (i / numBuoys) * math.pi * 2
		local buoyPos = basePos + Vector3.new(math.cos(angle) * courseRadius, 0, math.sin(angle) * courseRadius)

		local rounding = "port"
		if i % 2 == 0 then
			rounding = "starboard"
		end

		table.insert(self.buoys, {
			index = i,
			position = buoyPos,
			rounding = rounding,
			radius = 20,
			passed = {},
		})
	end
end

function CourseManager:checkBuoyPassing(playerId: number, position: Vector3, currentBuoyIndex: number): (boolean, number)
	if currentBuoyIndex > #self.buoys then
		return false, currentBuoyIndex
	end

	local buoy = self.buoys[currentBuoyIndex]
	local distance = (position - buoy.position).Magnitude

	if distance < buoy.radius then
		if not buoy.passed[playerId] then
			buoy.passed[playerId] = true
			return true, currentBuoyIndex + 1
		end
	end

	return false, currentBuoyIndex
end

function CourseManager:checkStartLineCrossing(position: Vector3, prevPosition: Vector3): boolean
	local line = self.startLine
	local toPos = position - line.position
	local toPrev = prevPosition - line.position

	local crossProduct1 = toPos.X * line.direction.Z - toPos.Z * line.direction.X
	local crossProduct2 = toPrev.X * line.direction.Z - toPrev.Z * line.direction.X

	if crossProduct1 * crossProduct2 < 0 then
		local distFromCenter = math.abs(toPos:Dot(line.direction))
		return distFromCenter < line.width / 2
	end

	return false
end

function CourseManager:checkFinishLineCrossing(position: Vector3, prevPosition: Vector3): boolean
	return self:checkStartLineCrossing(position, prevPosition)
end

function CourseManager:getNextBuoyDirection(position: Vector3, currentBuoyIndex: number): Vector3?
	if currentBuoyIndex > #self.buoys then
		return (self.finishLine.position - position).Unit
	end

	local buoy = self.buoys[currentBuoyIndex]
	return (buoy.position - position).Unit
end

function CourseManager:getDistanceToNextBuoy(position: Vector3, currentBuoyIndex: number): number
	if currentBuoyIndex > #self.buoys then
		return (self.finishLine.position - position).Magnitude
	end

	return (self.buoys[currentBuoyIndex].position - position).Magnitude
end

function CourseManager:getTotalBuoys(): number
	return #self.buoys
end

return CourseManager
