-- StarterPlayer
-- └─ StarterPlayerScripts
--    └─ SkiAirControl
--
-- 起伏から飛び出した際の飛距離を調整
-- レース中のみ有効

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer

local CONFIG = {
	HorizontalLaunchMultiplier = 1.4,

	VerticalLaunchMultiplier = 1.05,

	MinimumUpwardLaunchSpeed = 4,

	GroundRayLength = 8,

	AirConfirmationTime = 0.045,

	GroundConfirmationTime = 0.04,

	MinimumLaunchSpeed = 8,

	MinimumGroundNormalY = 0.2,

	MaximumHorizontalAirSpeed = 135,

	MaximumUpwardSpeed = 75,

	ApplyBoostOncePerJump = true,
}

local character = nil
local rootPart = nil
local humanoid = nil

local updateConnection = nil
local airControlActive = false

local raycastParams = RaycastParams.new()
raycastParams.FilterType =
	Enum.RaycastFilterType.Exclude
raycastParams.IgnoreWater = true

local wasGrounded = true
local jumpBoostApplied = false

local airTimer = 0
local groundTimer = 0

local lastGroundVelocity = Vector3.zero

--------------------------------------------------
-- 接地判定
--------------------------------------------------

local function getGroundResult()
	if not rootPart then
		return nil
	end

	local result = Workspace:Raycast(
		rootPart.Position,
		Vector3.new(
			0,
			-CONFIG.GroundRayLength,
			0
		),
		raycastParams
	)

	if not result then
		return nil
	end

	if result.Normal.Y
		< CONFIG.MinimumGroundNormalY then

		return nil
	end

	return result
end

--------------------------------------------------
-- 速度制限
--------------------------------------------------

local function limitHorizontalVelocity(
	horizontalVelocity
)
	local hSpeed =
		horizontalVelocity.Magnitude

	if hSpeed
		<= CONFIG.MaximumHorizontalAirSpeed then

		return horizontalVelocity
	end

	if hSpeed <= 0.001 then
		return Vector3.zero
	end

	return horizontalVelocity.Unit
		* CONFIG.MaximumHorizontalAirSpeed
end

--------------------------------------------------
-- 離陸ブースト
--------------------------------------------------

local function applyLaunchBoost()
	if not rootPart then
		return
	end

	if CONFIG.ApplyBoostOncePerJump
		and jumpBoostApplied then

		return
	end

	local sourceVelocity =
		lastGroundVelocity

	local horizontalVelocity =
		Vector3.new(
			sourceVelocity.X,
			0,
			sourceVelocity.Z
		)

	local horizontalSpeed =
		horizontalVelocity.Magnitude

	if horizontalSpeed
		< CONFIG.MinimumLaunchSpeed then

		return
	end

	horizontalVelocity *=
		CONFIG.HorizontalLaunchMultiplier

	horizontalVelocity =
		limitHorizontalVelocity(
			horizontalVelocity
		)

	local upwardSpeed =
		math.max(
			sourceVelocity.Y,
			0
		)

	upwardSpeed =
		math.max(
			upwardSpeed
			* CONFIG.VerticalLaunchMultiplier,
			CONFIG.MinimumUpwardLaunchSpeed
		)

	upwardSpeed =
		math.min(
			upwardSpeed,
			CONFIG.MaximumUpwardSpeed
		)

	rootPart.AssemblyLinearVelocity =
		Vector3.new(
			horizontalVelocity.X,
			upwardSpeed,
			horizontalVelocity.Z
		)

	jumpBoostApplied = true
end

--------------------------------------------------
-- 開始・停止
--------------------------------------------------

local function startAirControl()
	if airControlActive then
		return
	end

	if not rootPart or not humanoid then
		return
	end

	airControlActive = true
	wasGrounded = true
	jumpBoostApplied = false
	airTimer = 0
	groundTimer = 0

	lastGroundVelocity =
		rootPart.AssemblyLinearVelocity

	updateConnection =
		RunService.PreSimulation:Connect(
			function(deltaTime)
				if not character
					or not character.Parent
					or not rootPart
					or not rootPart.Parent
					or not humanoid
					or humanoid.Health <= 0 then

					return
				end

				local groundResult =
				getGroundResult()

				local currentlyGrounded =
				groundResult ~= nil

				if currentlyGrounded then
					groundTimer += deltaTime
					airTimer = 0

					lastGroundVelocity =
					rootPart
					.AssemblyLinearVelocity

					if groundTimer
						>= CONFIG
						.GroundConfirmationTime then

						if not wasGrounded then
							jumpBoostApplied =
								false
						end

						wasGrounded = true
					end
				else
					airTimer += deltaTime
					groundTimer = 0

					if wasGrounded
						and airTimer
						>= CONFIG
						.AirConfirmationTime then

						applyLaunchBoost()
						wasGrounded = false
					end
				end
			end
		)
end

local function stopAirControl()
	if not airControlActive then
		return
	end

	airControlActive = false

	if updateConnection then
		updateConnection:Disconnect()
		updateConnection = nil
	end
end

--------------------------------------------------
-- RaceStatus監視
--------------------------------------------------

local function onStatusChanged(
	targetCharacter
)
	local status =
		targetCharacter:GetAttribute(
			"RaceStatus"
		)

	if status == "Racing" then
		startAirControl()
	else
		stopAirControl()
	end
end

--------------------------------------------------
-- キャラクター設定
--------------------------------------------------

local function setupCharacter(newCharacter)
	stopAirControl()

	character = newCharacter

	humanoid =
		newCharacter:WaitForChild(
			"Humanoid"
		)

	rootPart =
		newCharacter:WaitForChild(
			"HumanoidRootPart"
		)

	raycastParams.FilterDescendantsInstances = {
		newCharacter,
	}

	newCharacter
		:GetAttributeChangedSignal(
			"RaceStatus"
		)
		:Connect(function()
			onStatusChanged(newCharacter)
		end)

	onStatusChanged(newCharacter)
end

if player.Character then
	task.spawn(
		setupCharacter,
		player.Character
	)
end

player.CharacterAdded:Connect(
	setupCharacter
)
