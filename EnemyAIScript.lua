-- EnemyAIScript（徘徊する敵AI + 視線判定 + 追跡）
-- このスクリプトを敵のModel内に入れる
-- Modelには HumanoidRootPart と Humanoid が必要
-- Workspace内に「WanderPoints」フォルダを作り、中にPartを配置すると巡回ポイントになる

local enemy = script.Parent
local humanoid = enemy:WaitForChild("Humanoid")
local rootPart = enemy:WaitForChild("HumanoidRootPart")
local Players = game:GetService("Players")

-- 設定
local wanderSpeed = 8         -- 巡回時の移動速度
local chaseSpeed = 18         -- 追跡時の移動速度
local sightRange = 40         -- 視界の距離
local sightAngle = 70         -- 視界の角度（前方±70度）
local hearingRange = 15       -- 音で気づく距離（壁越しでも）
local loseDistance = 50       -- 見失う距離
local killDistance = 4        -- この距離で捕まる
local wanderWaitTime = 2      -- 巡回ポイントで待機する秒数

-- 状態
local currentState = "wander" -- "wander" / "chase"
local currentTarget = nil
local lastKnownPosition = nil

-- 巡回ポイントを取得
local wanderFolder = workspace:FindFirstChild("WanderPoints")
local wanderPoints = {}
if wanderFolder then
	for _, point in ipairs(wanderFolder:GetChildren()) do
		if point:IsA("BasePart") then
			table.insert(wanderPoints, point)
		end
	end
end

-- Raycastで視線が通っているか判定
local function hasLineOfSight(targetPosition)
	local origin = rootPart.Position
	local direction = (targetPosition - origin)
	local distance = direction.Magnitude

	if distance > sightRange then return false end

	local rayParams = RaycastParams.new()
	rayParams.FilterDescendantsInstances = {enemy}
	rayParams.FilterType = Enum.RaycastFilterType.Exclude

	local result = workspace:Raycast(origin, direction.Unit * distance, rayParams)

	if result then
		local hitPart = result.Instance
		for _, player in ipairs(Players:GetPlayers()) do
			if player.Character and hitPart:IsDescendantOf(player.Character) then
				return true
			end
		end
		return false
	end

	return true
end

-- 視界の角度内にいるか判定
local function isInFieldOfView(targetPosition)
	local toTarget = (targetPosition - rootPart.Position).Unit
	local forward = rootPart.CFrame.LookVector
	local dotProduct = forward:Dot(toTarget)
	local angle = math.deg(math.acos(math.clamp(dotProduct, -1, 1)))
	return angle <= sightAngle
end

-- 最も近いプレイヤーを探す（視線判定付き）
local function findTarget()
	local closestPlayer = nil
	local closestDistance = math.huge

	for _, player in ipairs(Players:GetPlayers()) do
		if player.Character then
			local character = player.Character
			local hrp = character:FindFirstChild("HumanoidRootPart")
			local hum = character:FindFirstChild("Humanoid")

			if hrp and hum and hum.Health > 0 then
				-- 隠れ中のプレイヤーは無視
				if character:GetAttribute("IsHiding") then continue end

				local distance = (hrp.Position - rootPart.Position).Magnitude

				-- 近い音で気づく（壁越しでも）
				if distance <= hearingRange then
					if distance < closestDistance then
						closestDistance = distance
						closestPlayer = player
					end
				-- 視界内 + 視線が通っている
				elseif distance <= sightRange and isInFieldOfView(hrp.Position) and hasLineOfSight(hrp.Position) then
					if distance < closestDistance then
						closestDistance = distance
						closestPlayer = player
					end
				end
			end
		end
	end

	return closestPlayer
end

-- ランダムな巡回ポイントへ移動
local function wanderToRandomPoint()
	if #wanderPoints == 0 then
		local randomOffset = Vector3.new(
			math.random(-30, 30),
			0,
			math.random(-30, 30)
		)
		humanoid:MoveTo(rootPart.Position + randomOffset)
	else
		local point = wanderPoints[math.random(1, #wanderPoints)]
		humanoid:MoveTo(point.Position)
	end
end

-- プレイヤーを捕まえる（キル）
local function catchPlayer(player)
	if player.Character then
		local hum = player.Character:FindFirstChild("Humanoid")
		if hum and hum.Health > 0 then
			hum.Health = 0
		end
	end
end

-- メインループ
task.spawn(function()
	while true do
		task.wait(0.3)

		if currentState == "wander" then
			humanoid.WalkSpeed = wanderSpeed

			local target = findTarget()
			if target then
				currentState = "chase"
				currentTarget = target
			else
				if humanoid.MoveDirection.Magnitude < 0.1 then
					task.wait(wanderWaitTime)
					wanderToRandomPoint()
				end
			end

		elseif currentState == "chase" then
			humanoid.WalkSpeed = chaseSpeed

			if currentTarget and currentTarget.Character then
				local hrp = currentTarget.Character:FindFirstChild("HumanoidRootPart")
				local hum = currentTarget.Character:FindFirstChild("Humanoid")

				if hrp and hum and hum.Health > 0 then
					local distance = (hrp.Position - rootPart.Position).Magnitude

					-- 隠れたら見失う
					if currentTarget.Character:GetAttribute("IsHiding") then
						currentState = "wander"
						currentTarget = nil
						wanderToRandomPoint()
					-- 捕まえる
					elseif distance <= killDistance then
						catchPlayer(currentTarget)
						currentState = "wander"
						currentTarget = nil
						task.wait(3)
						wanderToRandomPoint()
					-- 見失った
					elseif distance > loseDistance then
						currentState = "wander"
						currentTarget = nil
						wanderToRandomPoint()
					-- 追跡続行
					else
						lastKnownPosition = hrp.Position
						humanoid:MoveTo(hrp.Position)
					end
				else
					currentState = "wander"
					currentTarget = nil
					wanderToRandomPoint()
				end
			else
				-- ターゲットがいなくなった → 最後に見た場所へ
				if lastKnownPosition then
					humanoid:MoveTo(lastKnownPosition)
					lastKnownPosition = nil
				end
				currentState = "wander"
				currentTarget = nil
			end
		end
	end
end)

-- 初回巡回開始
wanderToRandomPoint()
