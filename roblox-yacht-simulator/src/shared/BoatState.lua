local BoatState = {
	speed = 0,
	heading = Vector3.new(0, 0, -1),
	sailAngle = 0,
	heelAngle = 0,
	rudderAngle = 0,
	isTacking = false,
	isJibing = false,
	capsized = false,
	windDirection = Vector3.new(1, 0, 0),
	windSpeed = 10,
	position = Vector3.zero,
}

return BoatState
