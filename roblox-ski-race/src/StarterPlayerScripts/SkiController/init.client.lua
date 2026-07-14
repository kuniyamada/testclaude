-- StarterPlayer
-- └─ StarterPlayerScripts
--    └─ SkiController
--
-- カービングスキー版
--
-- レース中のみスキー操作を有効化
-- レース外は通常の歩行
--
-- A・左矢印：左カービング
-- D・右矢印：右カービング
-- W・上矢印：前傾して摩擦を減らす
-- S・下矢印：強くブレーキ

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer

local ANIMATION_IDS = {
	Straight = "rbxassetid://137437244110394",
	Left = "rbxassetid://133050228269199",
	Right = "rbxassetid://84609756868682",
}

local CONFIG = {
	GroundRayLength = 8,

	StartSpeed = 0,
	MaxSpeed = 100,
	StopSpeed = 0.8,

	DynamicFriction = 0.06,
	StaticFriction = 0.08,
	TuckFriction = 0.045,
	BrakeFriction = 0.32,

	SideSlipFriction = 0.06,

	BaseSidecutRadius = 200,

	MaximumEdgeAngle = math.rad(68),

	EdgeEngagementSpeed = 8,

	EdgeReleaseSpeed = 5,

	MinimumCarveSpeed = 4,

	FullCarveSpeed = 55,

	LowSpeedSteeringRate = math.rad(45),

	MaximumTurnRate = math.rad(150),

	SkiFlexibility = 0.72,

	SpeedFlexAmount = 0.72,

	SlopeFlexAmount = 0.25,

	EdgeFlexAmount = 0.45,

	FlexTurnGain = 1.10,

	FlexResponseSpeed = 6,

	CarveDrag = 0.035,

	EdgeChangeDrag = 0.018,

	PoseBlendSpeed = 7,
	MinimumTurnPoseStrength = 0.7,
}

--------------------------------------------------
-- 入力
--------------------------------------------------

local inputState = {
	left = false,
	right = false,
	tuck = false,
	brake = false,
}

local keyToAction = {
	[Enum.KeyCode.A] = "left",
	[Enum.KeyCode.Left] = "left",

	[Enum.KeyCode.D] = "right",
	[Enum.KeyCode.Right] = "right",

	[Enum.KeyCode.W] = "tuck",
	[Enum.KeyCode.Up] = "tuck",

	[Enum.KeyCode.S] = "brake",
	[Enum.KeyCode.Down] = "brake",
}

local function updateInput(
	inputObject,
	isPressed
)
	local actionName =
		keyToAction[inputObject.KeyCode]

	if actionName then
		inputState[actionName] = isPressed
	end
end

UserInputService.InputBegan:Connect(
	function(inputObject, gameProcessed)
		if gameProcessed then
			return
		end

		updateInput(inputObject, true)
	end
)

UserInputService.InputEnded:Connect(
	function(inputObject)
		updateInput(inputObject, false)
	end
)

--------------------------------------------------
-- 状態
--------------------------------------------------

local skiModeActive = false
local activeSimulationConnection = nil

local animationTracks = {
	Straight = nil,
	Left = nil,
	Right = nil,
}

local currentPoseBlend = 0

local currentCharacter = nil
local currentHumanoid = nil
local currentRootPart = nil

local alignOrientation = nil
local raycastParams = nil

local heading = Vector3.new(0, 0, -1)
local speed = 0
local initialDownhillChosen = false
local currentEdgeInput = 0
local currentFlex = 0
local previousEdgeInput = 0

--------------------------------------------------
-- 補助関数
--------------------------------------------------

local function getSmoothAlpha(
	smoothSpeed,
	deltaTime
)
	return 1
	- math.exp(
		-smoothSpeed * deltaTime
	)
end

local function lerpNumber(a, b, alpha)
	return a + (b - a) * alpha
end

--------------------------------------------------
-- アニメーション
--------------------------------------------------

local function stopAnimationTracks()
	for _, track in pairs(animationTracks) do
		if track then
			track:Stop(0.1)
		end
	end

	animationTracks.Straight = nil
	animationTracks.Left = nil
	animationTracks.Right = nil
end

local function loadAnimationTrack(
	animator,
	animationName,
	animationId
)
	local animation =
		Instance.new("Animation")

	animation.Name = animationName
	animation.AnimationId = animationId

	local success, result = pcall(function()
		return animator:LoadAnimation(
			animation
		)
	end)

	if not success then
		warn(
			animationName
				.. "を読み込めませんでした：",
			result
		)

		return nil
	end

	local track = result

	track.Priority =
		Enum.AnimationPriority.Action

	track.Looped = true

	return track
end

local function setupSkiAnimations(animator)
	stopAnimationTracks()

	animationTracks.Straight =
		loadAnimationTrack(
			animator,
			"SkiGlide",
			ANIMATION_IDS.Straight
		)

	animationTracks.Left =
		loadAnimationTrack(
			animator,
			"SkiTurnLeft",
			ANIMATION_IDS.Left
		)

	animationTracks.Right =
		loadAnimationTrack(
			animator,
			"SkiTurnRight",
			ANIMATION_IDS.Right
		)

	if animationTracks.Straight then
		animationTracks.Straight:Play(
			0.2,
			1,
			1
		)
	end

	if animationTracks.Left then
		animationTracks.Left:Play(
			0.2,
			0.001,
			1
		)
	end

	if animationTracks.Right then
		animationTracks.Right:Play(
			0.2,
			0.001,
			1
		)
	end

	currentPoseBlend = 0
end

local function updateAnimationWeights(
	turnInput,
	speedRatio,
	edgeAmount,
	deltaTime
)
	local speedStrength =
		CONFIG.MinimumTurnPoseStrength
		+ (
			1
			- CONFIG.MinimumTurnPoseStrength
		) * speedRatio

	local targetPoseBlend =
		turnInput
		* speedStrength
		* math.max(edgeAmount, 0.15)

	local blendAlpha =
		getSmoothAlpha(
			CONFIG.PoseBlendSpeed,
			deltaTime
		)

	currentPoseBlend =
		lerpNumber(
			currentPoseBlend,
			targetPoseBlend,
			blendAlpha
		)

	local leftWeight =
		math.max(currentPoseBlend, 0)

	local rightWeight =
		math.max(-currentPoseBlend, 0)

	local straightWeight =
		1 - math.max(
			leftWeight,
			rightWeight
		)

	straightWeight =
		math.clamp(straightWeight, 0.001, 1)

	leftWeight =
		math.clamp(leftWeight, 0.001, 1)

	rightWeight =
		math.clamp(rightWeight, 0.001, 1)

	if animationTracks.Straight then
		animationTracks.Straight:AdjustWeight(
			straightWeight,
			0
		)
	end

	if animationTracks.Left then
		animationTracks.Left:AdjustWeight(
			leftWeight,
			0
		)
	end

	if animationTracks.Right then
		animationTracks.Right:AdjustWeight(
			rightWeight,
			0
		)
	end
end

--------------------------------------------------
-- AlignOrientation
--------------------------------------------------

local function createOrientationController()
	local rootPart = currentRootPart

	local oldAttachment =
		rootPart:FindFirstChild(
			"SkiControlAttachment"
		)

	if oldAttachment then
		oldAttachment:Destroy()
	end

	local oldAlignOrientation =
		rootPart:FindFirstChild(
			"SkiAlignOrientation"
		)

	if oldAlignOrientation then
		oldAlignOrientation:Destroy()
	end

	local attachment =
		Instance.new("Attachment")

	attachment.Name =
		"SkiControlAttachment"

	attachment.Parent = rootPart

	local ao =
		Instance.new("AlignOrientation")

	ao.Name =
		"SkiAlignOrientation"

	ao.Mode =
		Enum.OrientationAlignmentMode
		.OneAttachment

	ao.Attachment0 = attachment
	ao.RigidityEnabled = false

	ao.Responsiveness = 35

	ao.MaxTorque = 100000000
	ao.MaxAngularVelocity = 35
	ao.Parent = rootPart

	return ao
end

--------------------------------------------------
-- スキーモード開始
--------------------------------------------------

local function enterSkiMode()
	if skiModeActive then
		return
	end

	if not currentCharacter
		or not currentHumanoid
		or not currentRootPart then

		return
	end

	if activeSimulationConnection then
		activeSimulationConnection:Disconnect()
		activeSimulationConnection = nil
	end

	stopAnimationTracks()

	local animateScript =
		currentCharacter:FindFirstChild(
			"Animate"
		)

	if animateScript
		and animateScript:IsA("LocalScript") then

		animateScript.Enabled = false
	end

	local animator =
		currentHumanoid
		:FindFirstChildOfClass("Animator")

	if not animator then
		animator = Instance.new("Animator")
		animator.Parent = currentHumanoid
	end

	for _, track in ipairs(
		animator:GetPlayingAnimationTracks()
		) do
		track:Stop(0.1)
	end

	setupSkiAnimations(animator)

	currentHumanoid.AutoRotate = false
	currentHumanoid.WalkSpeed = 0
	currentHumanoid.JumpPower = 0
	currentHumanoid.JumpHeight = 0

	alignOrientation =
		createOrientationController()

	raycastParams = RaycastParams.new()

	raycastParams.FilterType =
		Enum.RaycastFilterType.Exclude

	raycastParams.FilterDescendantsInstances = {
		currentCharacter,
	}

	raycastParams.IgnoreWater = true

	local flatForward = Vector3.new(
		currentRootPart.CFrame.LookVector.X,
		0,
		currentRootPart.CFrame.LookVector.Z
	)

	if flatForward.Magnitude > 0.01 then
		heading = flatForward.Unit
	else
		heading = Vector3.new(0, 0, -1)
	end

	speed = CONFIG.StartSpeed
	initialDownhillChosen = false
	currentEdgeInput = 0
	currentFlex = 0
	previousEdgeInput = 0

	skiModeActive = true
end

--------------------------------------------------
-- 物理シミュレーション開始
--------------------------------------------------

local function startSimulation()
	if activeSimulationConnection then
		return
	end

	if not skiModeActive then
		return
	end

	activeSimulationConnection =
		RunService.PreSimulation:Connect(
			function(deltaTime)
				if not currentCharacter
					or not currentCharacter.Parent
					or not currentRootPart
					or not currentRootPart.Parent
					or currentHumanoid.Health <= 0 then

					return
				end

				local raycastResult =
				Workspace:Raycast(
					currentRootPart.Position,
					Vector3.new(
						0,
						-CONFIG.GroundRayLength,
						0
					),
					raycastParams
				)

				if not raycastResult then
					alignOrientation.Enabled = false

					updateAnimationWeights(
						0,
						speed / CONFIG.MaxSpeed,
						0,
						deltaTime
					)

					return
				end

				local groundNormal =
				raycastResult.Normal

				if groundNormal.Y < 0.2 then
					alignOrientation.Enabled = false
					return
				end

				alignOrientation.Enabled = true

				--------------------------------------------------
				-- 斜面方向
				--------------------------------------------------

				local gravityDirection =
				Vector3.new(0, -1, 0)

				local downhillVector =
				gravityDirection
				- groundNormal
				* gravityDirection:Dot(
					groundNormal
				)

				local downhillMagnitude =
				downhillVector.Magnitude

				if not initialDownhillChosen
					and downhillMagnitude > 0.02 then

					heading = downhillVector.Unit
					initialDownhillChosen = true
				end

				local projectedHeading =
				heading
				- groundNormal
				* heading:Dot(
					groundNormal
				)

				if projectedHeading.Magnitude > 0.01 then
					heading = projectedHeading.Unit
				elseif downhillMagnitude > 0.01 then
					heading = downhillVector.Unit
				end

				--------------------------------------------------
				-- 左右入力
				--------------------------------------------------

				local turnInput = 0

				if inputState.left then
					turnInput += 1
				end

				if inputState.right then
					turnInput -= 1
				end

				local edgeResponseSpeed

				if turnInput == 0 then
					edgeResponseSpeed =
					CONFIG.EdgeReleaseSpeed
				else
					edgeResponseSpeed =
					CONFIG.EdgeEngagementSpeed
				end

				local edgeAlpha =
				getSmoothAlpha(
					edgeResponseSpeed,
					deltaTime
				)

				currentEdgeInput =
				lerpNumber(
					currentEdgeInput,
					turnInput,
					edgeAlpha
				)

				local edgeAmount =
				math.abs(currentEdgeInput)

				local edgeAngle =
				CONFIG.MaximumEdgeAngle
				* edgeAmount

				--------------------------------------------------
				-- 速度と斜面角度
				--------------------------------------------------

				local speedRatio =
				math.clamp(
					speed / CONFIG.MaxSpeed,
					0,
					1
				)

				local carveSpeedRatio =
				math.clamp(
					(
						speed
						- CONFIG.MinimumCarveSpeed
					)
					/ (
						CONFIG.FullCarveSpeed
						- CONFIG.MinimumCarveSpeed
					),
					0,
					1
				)

				local slopeSteepness =
				math.clamp(
					downhillMagnitude,
					0,
					1
				)

				--------------------------------------------------
				-- スキーのたわみ
				--------------------------------------------------

				local speedFlex =
				carveSpeedRatio
				* carveSpeedRatio
				* CONFIG.SpeedFlexAmount

				local slopeFlex =
				slopeSteepness
				* CONFIG.SlopeFlexAmount

				local edgeFlex =
				edgeAmount
				* CONFIG.EdgeFlexAmount

				local targetFlex =
				(
					speedFlex
					+ slopeFlex
					+ edgeFlex
				)
				* CONFIG.SkiFlexibility

				targetFlex =
				math.clamp(
					targetFlex,
					0,
					1
				)

				local flexAlpha =
				getSmoothAlpha(
					CONFIG.FlexResponseSpeed,
					deltaTime
				)

				currentFlex =
				lerpNumber(
					currentFlex,
					targetFlex,
					flexAlpha
				)

				--------------------------------------------------
				-- 実効旋回半径
				--------------------------------------------------

				local edgeRadiusFactor =
				math.max(
					math.cos(edgeAngle),
					0.28
				)

				local effectiveRadius =
				CONFIG.BaseSidecutRadius
				* edgeRadiusFactor

				effectiveRadius =
				effectiveRadius
				/ (
					1
					+ currentFlex
					* CONFIG.FlexTurnGain
				)

				effectiveRadius =
				math.max(
					effectiveRadius,
					8
				)

				--------------------------------------------------
				-- カービング旋回
				--------------------------------------------------

				local carveTurnRate = 0

				if speed
					> CONFIG.MinimumCarveSpeed then

					carveTurnRate =
					speed / effectiveRadius

					carveTurnRate *=
					carveSpeedRatio

					carveTurnRate *=
					edgeAmount
				end

				local lowSpeedAssistance =
				CONFIG.LowSpeedSteeringRate
				* (
					1 - carveSpeedRatio
				)
				* edgeAmount

				local totalTurnRate =
				carveTurnRate
				+ lowSpeedAssistance

				totalTurnRate =
				math.clamp(
					totalTurnRate,
					0,
					CONFIG.MaximumTurnRate
				)

				local turnRotation =
				CFrame.fromAxisAngle(
					groundNormal,
					math.sign(currentEdgeInput)
					* totalTurnRate
					* deltaTime
				)

				heading =
				turnRotation:
				VectorToWorldSpace(
					heading
				)

				projectedHeading =
				heading
				- groundNormal
				* heading:Dot(
					groundNormal
				)

				if projectedHeading.Magnitude > 0.01 then
					heading = projectedHeading.Unit
				end

				updateAnimationWeights(
					currentEdgeInput,
					speedRatio,
					edgeAmount,
					deltaTime
				)

				--------------------------------------------------
				-- 重力と摩擦
				--------------------------------------------------

				local gravity =
				Workspace.Gravity

				local normalFactor =
				math.clamp(
					groundNormal.Y,
					0,
					1
				)

				local slopeGravityAcceleration =
				gravity
				* downhillVector:Dot(
					heading
				)

				local downhillAlignment = 0

				if downhillMagnitude > 0.001 then
					downhillAlignment =
					downhillVector.Unit:Dot(
						heading
					)
				end

				local frictionCoefficient =
				CONFIG.DynamicFriction

				if inputState.tuck then
					frictionCoefficient =
					CONFIG.TuckFriction
				end

				if inputState.brake then
					frictionCoefficient =
					CONFIG.BrakeFriction
				end

				local sideSlipAmount =
				1 - math.abs(
					downhillAlignment
				)

				local carveGrip =
				edgeAmount
				* carveSpeedRatio

				local remainingSideSlip =
				sideSlipAmount
				* (
					1 - carveGrip * 0.75
				)

				frictionCoefficient +=
				CONFIG.SideSlipFriction
				* remainingSideSlip

				frictionCoefficient +=
				CONFIG.CarveDrag
				* edgeAmount
				* currentFlex
				* carveSpeedRatio

				local edgeChange =
				math.abs(
					currentEdgeInput
					- previousEdgeInput
				)
				/ math.max(deltaTime, 0.001)

				frictionCoefficient +=
				CONFIG.EdgeChangeDrag
				* math.clamp(
					edgeChange / 8,
					0,
					1
				)

				previousEdgeInput =
				currentEdgeInput

				local frictionAcceleration =
				frictionCoefficient
				* gravity
				* normalFactor

				local acceleration

				if speed <= CONFIG.StopSpeed then
					local staticResistance =
					CONFIG.StaticFriction
					* gravity
					* normalFactor

					if slopeGravityAcceleration
						<= staticResistance then

						speed = 0
						acceleration = 0
					else
						acceleration =
						slopeGravityAcceleration
						- staticResistance
					end
				else
					acceleration =
					slopeGravityAcceleration
					- frictionAcceleration
				end

				speed =
				math.clamp(
					speed
					+ acceleration
					* deltaTime,
					0,
					CONFIG.MaxSpeed
				)

				if speed < CONFIG.StopSpeed
					and acceleration <= 0 then

					speed = 0
				end

				--------------------------------------------------
				-- 移動と身体方向
				--------------------------------------------------

				currentRootPart
				.AssemblyLinearVelocity =
				heading * speed

				alignOrientation.CFrame =
				CFrame.lookAt(
					Vector3.zero,
					heading,
					groundNormal
				)
			end
		)
end

--------------------------------------------------
-- スキーモード終了
--------------------------------------------------

local function exitSkiMode()
	if not skiModeActive then
		return
	end

	if activeSimulationConnection then
		activeSimulationConnection:Disconnect()
		activeSimulationConnection = nil
	end

	stopAnimationTracks()

	if currentCharacter then
		local animateScript =
			currentCharacter:FindFirstChild(
				"Animate"
			)

		if animateScript
			and animateScript:IsA(
				"LocalScript"
			) then

			animateScript.Enabled = true
		end
	end

	if currentRootPart then
		local oldAttachment =
			currentRootPart:FindFirstChild(
				"SkiControlAttachment"
			)

		if oldAttachment then
			oldAttachment:Destroy()
		end

		local oldAlign =
			currentRootPart:FindFirstChild(
				"SkiAlignOrientation"
			)

		if oldAlign then
			oldAlign:Destroy()
		end
	end

	if currentHumanoid then
		currentHumanoid.AutoRotate = true
		currentHumanoid.WalkSpeed = 16
		currentHumanoid.JumpPower = 50
		currentHumanoid.JumpHeight = 7.2
	end

	alignOrientation = nil
	skiModeActive = false
end

--------------------------------------------------
-- RaceStatus監視
--------------------------------------------------

local function onStatusChanged(character)
	local status =
		character:GetAttribute(
			"RaceStatus"
		)

	if status == "AtStart" then
		enterSkiMode()

	elseif status == "Racing" then
		if not skiModeActive then
			enterSkiMode()
		end

		startSimulation()

	else
		exitSkiMode()
	end
end

--------------------------------------------------
-- キャラクター設定
--------------------------------------------------

local function onCharacterAdded(character)
	currentCharacter = character

	currentHumanoid =
		character:WaitForChild("Humanoid")

	currentRootPart =
		character:WaitForChild(
			"HumanoidRootPart"
		)

	if currentHumanoid.RigType
		~= Enum.HumanoidRigType.R15 then

		warn("このスキーシステムはR15用です。")
	end

	character
		:GetAttributeChangedSignal(
			"RaceStatus"
		)
		:Connect(function()
			onStatusChanged(character)
		end)

	onStatusChanged(character)
end

if player.Character then
	task.spawn(
		onCharacterAdded,
		player.Character
	)
end

player.CharacterAdded:Connect(
	onCharacterAdded
)
