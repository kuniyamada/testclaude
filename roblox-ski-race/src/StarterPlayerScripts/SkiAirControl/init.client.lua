-- StarterPlayer
-- └─ StarterPlayerScripts
--    └─ SkiAirControl
--
-- 起伏から飛び出した際の飛距離を調整します。
--
-- ・離陸時の水平方向速度を増減
-- ・上方向の速度を増減
-- ・空中での最高速度を制限
-- ・小さな段差では誤作動しにくい
-- ・着地後に再び離陸可能

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer

local CONFIG = {
	--------------------------------------------------
	-- 飛距離
	--------------------------------------------------

	-- 水平方向の飛距離倍率
	--
	-- 1.00：現在と同じ
	-- 1.15：15%ほど遠くへ飛ぶ
	-- 1.30：かなり遠くへ飛ぶ
	-- 0.85：飛距離を短くする
	HorizontalLaunchMultiplier = 1.4,

	--------------------------------------------------
	-- 高さ
	--------------------------------------------------

	-- 離陸時の上方向速度倍率
	--
	-- 1.00：現在と同じ
	-- 1.15：少し高く飛ぶ
	-- 0.80：低く飛ぶ
	VerticalLaunchMultiplier = 1.05,

	-- 起伏から離れたときに加える
	-- 最低限の上向き速度
	--
	-- 大きくすると小さな起伏でも浮きやすくなる
	MinimumUpwardLaunchSpeed = 4,

	--------------------------------------------------
	-- 判定
	--------------------------------------------------

	-- 地面を探すRaycastの長さ
	GroundRayLength = 8,

	-- 一瞬だけ地面判定が切れた場合に
	-- 離陸と判断しないための時間
	AirConfirmationTime = 0.045,

	-- 着地と判断するまでの時間
	GroundConfirmationTime = 0.04,

	-- この速度未満では
	-- 離陸ブーストを適用しない
	MinimumLaunchSpeed = 8,

	-- 地面が急すぎる場合は
	-- 通常の雪面として扱わない
	MinimumGroundNormalY = 0.2,

	--------------------------------------------------
	-- 安全制限
	--------------------------------------------------

	-- 空中での最大水平速度
	MaximumHorizontalAirSpeed = 135,

	-- 空中での最大上昇速度
	MaximumUpwardSpeed = 75,

	-- 1回の離陸につき
	-- ブーストを1回だけ適用
	ApplyBoostOncePerJump = true,
}

local character = nil
local rootPart = nil
local humanoid = nil

local updateConnection = nil

local raycastParams = RaycastParams.new()
raycastParams.FilterType = Enum.RaycastFilterType.Exclude
raycastParams.IgnoreWater = true

local wasGrounded = true
local jumpBoostApplied = false

local airTimer = 0
local groundTimer = 0

-- 接地中に記録しておく速度
local lastGroundVelocity = Vector3.zero

local function disconnectCurrentCharacter()
	if updateConnection then
		updateConnection:Disconnect()
		updateConnection = nil
	end
end

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

local function limitHorizontalVelocity(
	horizontalVelocity
)
	local speed = horizontalVelocity.Magnitude

	if speed
		<= CONFIG.MaximumHorizontalAirSpeed then

		return horizontalVelocity
	end

	if speed <= 0.001 then
		return Vector3.zero
	end

	return horizontalVelocity.Unit
		* CONFIG.MaximumHorizontalAirSpeed
end

local function applyLaunchBoost()
	if not rootPart then
		return
	end

	if CONFIG.ApplyBoostOncePerJump
		and jumpBoostApplied then

		return
	end

	-- 離陸直前に地面で持っていた速度を基準にする
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

	-- 水平方向の飛距離を調整
	horizontalVelocity *=
		CONFIG.HorizontalLaunchMultiplier

	horizontalVelocity =
		limitHorizontalVelocity(
			horizontalVelocity
		)

	-- 離陸直前の上向き速度を取得
	local upwardSpeed =
		math.max(
			sourceVelocity.Y,
			0
		)

	-- 起伏を越えたときに
	-- 最低限の上向き速度を与える
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

local function setupCharacter(newCharacter)
	disconnectCurrentCharacter()

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

					-- 接地時の速度を保存
					lastGroundVelocity =
					rootPart.AssemblyLinearVelocity

					if groundTimer
						>= CONFIG.GroundConfirmationTime then

						if not wasGrounded then
							-- 着地したので
							-- 次のジャンプを許可
							jumpBoostApplied = false
						end

						wasGrounded = true
					end
				else
					airTimer += deltaTime
					groundTimer = 0

					if wasGrounded
						and airTimer
						>= CONFIG.AirConfirmationTime then

						-- 接地状態から空中へ変化
						applyLaunchBoost()
						wasGrounded = false
					end
				end
			end
		)
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
