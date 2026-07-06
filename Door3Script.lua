-- Door3Script（鍵なし・Eキーで開く）
-- このスクリプトは「Door3」の中に入れる
-- 近づいてEキーを押すだけで開く（鍵不要）

local door = script.Parent
local openOffset = Vector3.new(7, 0, 0) -- 横にスライドして開く
local moveSpeed = 0.05
local interactDistance = 10

local isOpen = false
local isMoving = false
local closedCFrame = door.CFrame

local prompt = Instance.new("ProximityPrompt")
prompt.ObjectText = "扉"
prompt.ActionText = "開ける"
prompt.KeyboardKeyCode = Enum.KeyCode.E
prompt.MaxActivationDistance = interactDistance
prompt.HoldDuration = 0
prompt.Parent = door

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

prompt.Triggered:Connect(function(player)
	if isMoving then return end
	if isOpen then return end

	moveDoor(closedCFrame * CFrame.new(openOffset))
	prompt.Enabled = false
	isOpen = true
end)
