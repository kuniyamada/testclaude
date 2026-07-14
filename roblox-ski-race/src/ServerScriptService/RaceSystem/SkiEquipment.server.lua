-- ServerScriptService
-- └─ SkiEquipment
--
-- R15キャラクターの左右の足に
-- スキー板を装着するスクリプト
--
-- レース開始時（AtStart/Racing）に装着
-- レース終了時に取り外す

local Players = game:GetService("Players")

local CONFIG = {
	BoardSize = Vector3.new(
		0.9,
		0.14,
		5.6
	),

	BoardColor = Color3.fromRGB(
		225,
		35,
		55
	),

	BoardMaterial =
		Enum.Material.SmoothPlastic,

	ForwardOffset = -0.45,

	VerticalAdjustment = 0.03,

	CastShadow = false,
}

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

	ski.CanCollide = false
	ski.CanTouch = false
	ski.CanQuery = false

	ski.Massless = true

	ski.CastShadow =
		CONFIG.CastShadow

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

	local weld =
		Instance.new("WeldConstraint")

	weld.Name =
		skiName .. "Weld"

	weld.Part0 = foot
	weld.Part1 = ski
	weld.Parent = ski

	ski.Anchored = false

	return ski
end

local function attachSkis(character)
	local humanoid =
		character:FindFirstChildOfClass(
			"Humanoid"
		)

	if not humanoid then
		return
	end

	if humanoid.RigType
		~= Enum.HumanoidRigType.R15 then

		return
	end

	local leftFoot =
		character:FindFirstChild(
			"LeftFoot"
		)

	local rightFoot =
		character:FindFirstChild(
			"RightFoot"
		)

	if not leftFoot
		or not rightFoot then

		return
	end

	local oldEquipment =
		character:FindFirstChild(
			"SkiEquipment"
		)

	if oldEquipment then
		return
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

local function removeSkis(character)
	local equipment =
		character:FindFirstChild(
			"SkiEquipment"
		)

	if equipment then
		equipment:Destroy()
	end
end

local function onStatusChanged(character)
	local status =
		character:GetAttribute(
			"RaceStatus"
		)

	if status == "AtStart"
		or status == "Racing" then

		attachSkis(character)
	else
		removeSkis(character)
	end
end

local function setupPlayer(player)
	local function onCharacter(character)
		character:WaitForChild(
			"Humanoid",
			10
		)

		character:WaitForChild(
			"LeftFoot",
			10
		)

		character:WaitForChild(
			"RightFoot",
			10
		)

		character
			:GetAttributeChangedSignal(
				"RaceStatus"
			)
			:Connect(function()
				onStatusChanged(character)
			end)

		onStatusChanged(character)
	end

	player.CharacterAdded:Connect(
		onCharacter
	)

	if player.Character then
		task.spawn(
			onCharacter,
			player.Character
		)
	end
end

for _, player in ipairs(
	Players:GetPlayers()
	) do
	setupPlayer(player)
end

Players.PlayerAdded:Connect(
	setupPlayer
)
