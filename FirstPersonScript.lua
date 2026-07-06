-- FirstPersonScript（一人称視点）
-- StarterPlayerScripts に入れる（LocalScript）
-- プレイヤーを強制的に一人称視点にする

local Players = game:GetService("Players")
local player = Players.LocalPlayer

-- カメラを一人称に固定
player.CameraMode = Enum.CameraMode.LockFirstPerson
player.CameraMaxZoomDistance = 0.5
player.CameraMinZoomDistance = 0.5

-- キャラクターが読み込まれたときにも再適用
player.CharacterAdded:Connect(function(character)
	player.CameraMode = Enum.CameraMode.LockFirstPerson
	player.CameraMaxZoomDistance = 0.5
	player.CameraMinZoomDistance = 0.5
end)
