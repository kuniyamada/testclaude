-- ServerScriptService/RaceSystem
-- └─ CourseBuilder
--
-- Workspace に RaceCourse が存在しない場合
-- デモ用のコースを自動生成する
--
-- 本番では Roblox Studio でコースを作り
-- このスクリプトを削除または無効化する

local Workspace = game:GetService("Workspace")

if Workspace:FindFirstChild("RaceCourse") then
	return
end

--------------------------------------------------
-- 設定
--------------------------------------------------

local COURSE = {
	startPosition = Vector3.new(0, 200, 0),
	slopeAngle = 30,
	slopeLength = 600,
	slopeWidth = 60,

	checkpointCount = 5,
	checkpointSize = Vector3.new(40, 20, 6),

	joinZoneSize = Vector3.new(30, 10, 30),
	finishSize = Vector3.new(40, 20, 6),

	gateWidth = 3,
	gateHeight = 8,
	gateColor = {
		left = Color3.fromRGB(255, 50, 50),
		right = Color3.fromRGB(0, 100, 255),
	},
}

--------------------------------------------------
-- コースフォルダ
--------------------------------------------------

local raceCourse = Instance.new("Model")
raceCourse.Name = "RaceCourse"

--------------------------------------------------
-- 斜面
--------------------------------------------------

local slopeAngleRad =
	math.rad(COURSE.slopeAngle)

local slopeDirection =
	Vector3.new(0, -math.sin(slopeAngleRad),
		-math.cos(slopeAngleRad))

local slopePart = Instance.new("Part")
slopePart.Name = "Slope"
slopePart.Anchored = true
slopePart.Size = Vector3.new(
	COURSE.slopeWidth,
	4,
	COURSE.slopeLength
)
slopePart.Material = Enum.Material.Glacier
slopePart.Color = Color3.fromRGB(240, 245, 255)
slopePart.TopSurface = Enum.SurfaceType.Smooth
slopePart.BottomSurface = Enum.SurfaceType.Smooth

local slopeCenter =
	COURSE.startPosition
	+ slopeDirection * (COURSE.slopeLength * 0.5)

slopePart.CFrame = CFrame.new(
	slopeCenter,
	slopeCenter + slopeDirection
) * CFrame.Angles(-slopeAngleRad, 0, 0)

slopePart.Parent = raceCourse

--------------------------------------------------
-- サイドウォール
--------------------------------------------------

local wallHeight = 12
local wallThickness = 4

for _, side in ipairs({-1, 1}) do
	local wall = Instance.new("Part")
	wall.Name = "Wall_" ..
		(side == -1 and "Left" or "Right")
	wall.Anchored = true
	wall.Size = Vector3.new(
		wallThickness,
		wallHeight,
		COURSE.slopeLength
	)
	wall.Material = Enum.Material.Glacier
	wall.Color = Color3.fromRGB(200, 210, 220)
	wall.Transparency = 0.3

	local offset = Vector3.new(
		side * (COURSE.slopeWidth / 2
			+ wallThickness / 2),
		wallHeight / 2,
		0
	)

	wall.CFrame = slopePart.CFrame
		* CFrame.new(offset)

	wall.Parent = raceCourse
end

--------------------------------------------------
-- JoinZone（斜面の上端）
--------------------------------------------------

local joinZone = Instance.new("Part")
joinZone.Name = "JoinZone"
joinZone.Anchored = true
joinZone.CanCollide = false
joinZone.CanTouch = false
joinZone.Size = COURSE.joinZoneSize
joinZone.Transparency = 0.6
joinZone.Color = Color3.fromRGB(0, 255, 100)
joinZone.Material = Enum.Material.Neon

local joinPosition =
	COURSE.startPosition
	+ Vector3.new(0, COURSE.joinZoneSize.Y / 2, 10)

joinZone.CFrame = CFrame.new(joinPosition)
joinZone.Parent = raceCourse

--------------------------------------------------
-- チェックポイント
--------------------------------------------------

local checkpointsFolder =
	Instance.new("Folder")
checkpointsFolder.Name = "Checkpoints"
checkpointsFolder.Parent = raceCourse

for i = 1, COURSE.checkpointCount do
	local fraction =
		i / (COURSE.checkpointCount + 1)

	local cpPosition =
		COURSE.startPosition
		+ slopeDirection
		* (COURSE.slopeLength * fraction)
		+ Vector3.new(
			0,
			COURSE.checkpointSize.Y / 2,
			0
		)

	local cpPart = Instance.new("Part")
	cpPart.Name = tostring(i)
	cpPart.Anchored = true
	cpPart.CanCollide = false
	cpPart.CanTouch = false
	cpPart.Size = COURSE.checkpointSize
	cpPart.Transparency = 0.7
	cpPart.Color = Color3.fromRGB(255, 200, 0)
	cpPart.Material = Enum.Material.Neon

	cpPart.CFrame = CFrame.new(
		cpPosition,
		cpPosition + slopeDirection
	)

	cpPart.Parent = checkpointsFolder

	-- ゲートポール
	for _, poleSide in ipairs({-1, 1}) do
		local pole = Instance.new("Part")
		pole.Name = string.format(
			"Gate_%d_%s",
			i,
			poleSide == -1 and "L" or "R"
		)
		pole.Anchored = true
		pole.Size = Vector3.new(
			COURSE.gateWidth,
			COURSE.gateHeight,
			COURSE.gateWidth
		)
		pole.Shape = Enum.PartType.Cylinder
		pole.Material = Enum.Material.Plastic

		pole.Color = poleSide == -1
			and COURSE.gateColor.left
			or COURSE.gateColor.right

		local poleOffset = Vector3.new(
			poleSide
				* (COURSE.checkpointSize.X / 2
					+ COURSE.gateWidth),
			0,
			0
		)

		pole.CFrame = cpPart.CFrame
			* CFrame.new(poleOffset)
			* CFrame.Angles(0, 0, math.rad(90))

		pole.Parent = raceCourse
	end
end

--------------------------------------------------
-- Finish（斜面の下端）
--------------------------------------------------

local finishPart = Instance.new("Part")
finishPart.Name = "Finish"
finishPart.Anchored = true
finishPart.CanCollide = false
finishPart.CanTouch = false
finishPart.Size = COURSE.finishSize
finishPart.Transparency = 0.5
finishPart.Color = Color3.fromRGB(255, 50, 50)
finishPart.Material = Enum.Material.Neon

local finishFraction =
	COURSE.checkpointCount
	/ (COURSE.checkpointCount + 1)
	+ 1 / (COURSE.checkpointCount + 1)
	* 0.8

local finishPosition =
	COURSE.startPosition
	+ slopeDirection
	* (COURSE.slopeLength * finishFraction)
	+ Vector3.new(
		0,
		COURSE.finishSize.Y / 2,
		0
	)

finishPart.CFrame = CFrame.new(
	finishPosition,
	finishPosition + slopeDirection
)

finishPart.Parent = raceCourse

--------------------------------------------------
-- フィニッシュバナー
--------------------------------------------------

local banner = Instance.new("Part")
banner.Name = "FinishBanner"
banner.Anchored = true
banner.Size = Vector3.new(
	COURSE.finishSize.X + 10,
	3,
	1
)
banner.Color = Color3.fromRGB(255, 255, 255)
banner.Material = Enum.Material.SmoothPlastic

banner.CFrame = finishPart.CFrame
	* CFrame.new(0, COURSE.finishSize.Y / 2 + 2, 0)

local surfaceGui =
	Instance.new("SurfaceGui")
surfaceGui.Face = Enum.NormalId.Front
surfaceGui.Parent = banner

local finishText = Instance.new("TextLabel")
finishText.Size = UDim2.new(1, 0, 1, 0)
finishText.BackgroundTransparency = 1
finishText.Text = "FINISH"
finishText.TextColor3 =
	Color3.fromRGB(255, 0, 0)
finishText.TextScaled = true
finishText.Font = Enum.Font.GothamBold
finishText.Parent = surfaceGui

banner.Parent = raceCourse

--------------------------------------------------
-- スポーンポイント
--------------------------------------------------

local spawnLocation =
	Instance.new("SpawnLocation")
spawnLocation.Name = "RaceSpawn"
spawnLocation.Anchored = true
spawnLocation.Size = Vector3.new(20, 1, 20)
spawnLocation.Material = Enum.Material.Glacier
spawnLocation.Color =
	Color3.fromRGB(200, 220, 255)
spawnLocation.CFrame = CFrame.new(
	COURSE.startPosition
	+ Vector3.new(0, 0.5, 20)
)
spawnLocation.Parent = raceCourse

--------------------------------------------------
-- 配置
--------------------------------------------------

raceCourse.Parent = Workspace

print(
	"CourseBuilder: デモコース生成完了",
	COURSE.checkpointCount,
	"チェックポイント"
)
