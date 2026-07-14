-- ServerScriptService
-- └─ SkiEquipment
--
-- R15キャラクターの左右の足に
-- スキー板を自動装着するスクリプト

local Players = game:GetService("Players")

local CONFIG = {
	-- スキー板の大きさ
	-- X = 横幅
	-- Y = 厚さ
	-- Z = 長さ
	BoardSize = Vector3.new(
		0.9,
		0.14,
		5.6
	),

	-- スキー板の色
	BoardColor = Color3.fromRGB(
		225,
		35,
		55
	),

	-- スキー板の素材
	BoardMaterial =
		Enum.Material.SmoothPlastic,

	-- 足に対する前後位置
	-- マイナスにすると前へ移動
	ForwardOffset = -0.45,

	-- 足の裏との隙間
	-- 大きくすると板が少し上へ移動
	VerticalAdjustment = 0.03,

	-- 影を表示するか
	CastShadow = false,
}

-- 片方の足にスキー板を作る
local function createSki(
	foot,
	equipmentFolder,
	skiName
)
	local ski = Instance.new("Part")

	ski.Name = skiName
	ski.Size = CONFIG.BoardSize

	ski.Color =
		CONFIG.BoardColor

	ski.Material =
		CONFIG.BoardMaterial

	ski.Anchored = true

	-- キャラクターの当たり判定へ
	-- 影響させない
	ski.CanCollide = false
	ski.CanTouch = false
	ski.CanQuery = false

	-- キャラクターの重さへ
	-- 影響させない
	ski.Massless = true

	ski.CastShadow =
		CONFIG.CastShadow

	-- 足のすぐ下へ配置する
	local verticalOffset =
		-(
			foot.Size.Y / 2
			+ CONFIG.BoardSize.Y / 2
		)
		+ CONFIG.VerticalAdjustment

	ski.CFrame =
		foot.CFrame
		* CFrame.new(
			0,
			verticalOffset,
			CONFIG.ForwardOffset
		)

	ski.Parent =
		equipmentFolder

	-- 足とスキー板を固定する
	local weld =
		Instance.new("WeldConstraint")

	weld.Name =
		skiName .. "Weld"

	weld.Part0 = foot
	weld.Part1 = ski
	weld.Parent = ski

	-- 固定後に動けるようにする
	ski.Anchored = false

	return ski
end

-- キャラクターへスキー板を装着する
local function attachSkis(character)
	local humanoid =
		character:WaitForChild(
			"Humanoid",
			10
		)

	if not humanoid then
		warn(
			"Humanoidが見つかりません：",
			character.Name
		)

		return
	end

	-- 今回はR15専用
	if humanoid.RigType
		~= Enum.HumanoidRigType.R15 then

		warn(
			"スキー板はR15専用です：",
			character.Name
		)

		return
	end

	local leftFoot =
		character:WaitForChild(
			"LeftFoot",
			10
		)

	local rightFoot =
		character:WaitForChild(
			"RightFoot",
			10
		)

	if not leftFoot
		or not rightFoot then

		warn(
			"左右の足が見つかりません：",
			character.Name
		)

		return
	end

	-- 二重に装着されないように削除
	local oldEquipment =
		character:FindFirstChild(
			"SkiEquipment"
		)

	if oldEquipment then
		oldEquipment:Destroy()
	end

	local equipmentFolder =
		Instance.new("Folder")

	equipmentFolder.Name =
		"SkiEquipment"

	equipmentFolder.Parent =
		character

	createSki(
		leftFoot,
		equipmentFolder,
		"LeftSki"
	)

	createSki(
		rightFoot,
		equipmentFolder,
		"RightSki"
	)
end

-- プレイヤーごとの設定
local function setupPlayer(player)
	player.CharacterAdded:Connect(
		function(character)
			attachSkis(character)
		end
	)

	-- スクリプト起動時に
	-- すでにキャラクターがいる場合
	if player.Character then
		task.spawn(
			attachSkis,
			player.Character
		)
	end
end

-- すでに参加しているプレイヤー
for _, player in ipairs(
	Players:GetPlayers()
	) do
	setupPlayer(player)
end

-- 後から参加したプレイヤー
Players.PlayerAdded:Connect(
	setupPlayer
)
