-- DoorButtonScript
-- ボタン（Part）を押すと扉が開閉するスクリプト
-- 構成: Workspace内に「Door」という名前のPartと「DoorButton」という名前のPartを配置
-- このスクリプトは「DoorButton」の中に入れる

local button = script.Parent
local door = workspace:FindFirstChild("Door")

-- 設定
local openOffset = Vector3.new(0, 7, 0) -- 扉が上に7スタッド移動して開く
local moveSpeed = 0.05 -- 開閉の速さ（小さいほど遅い）
local cooldown = 1 -- ボタン連打防止（秒）

local isOpen = false
local isMoving = false
local closedCFrame = nil

local function moveDoor(targetCFrame)
	isMoving = true
	local steps = 20
	local startCFrame = door.CFrame
	for i = 1, steps do
		door.CFrame = startCFrame:Lerp(targetCFrame, i / steps)
		task.wait(moveSpeed)
	end
	isMoving = false
end

local function onButtonTouched(hit)
	if isMoving then return end

	-- プレイヤーが触れたときだけ反応
	local player = game:GetService("Players"):GetPlayerFromCharacter(hit.Parent)
	if not player then return end

	if not door then
		door = workspace:FindFirstChild("Door")
		if not door then return end
	end

	-- 初回に閉じた状態の位置を記録
	if not closedCFrame then
		closedCFrame = door.CFrame
	end

	if isOpen then
		-- 閉じる
		moveDoor(closedCFrame)
		isOpen = false
	else
		-- 開く
		moveDoor(closedCFrame * CFrame.new(openOffset))
		isOpen = true
	end

	task.wait(cooldown)
end

button.Touched:Connect(onButtonTouched)
