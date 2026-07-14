-- StarterPlayer
-- └─ StarterPlayerScripts
--    └─ SkiController
--
-- カービングスキー版
--
-- A・左矢印：左カービング
-- D・右矢印：右カービング
-- W・上矢印：前傾して摩擦を減らす
-- S・下矢印：強くブレーキ
--
-- カービング計算
-- ・スキーのサイドカット
-- ・エッジ角
-- ・速度による荷重
-- ・斜面角度
-- ・スキーのたわみ
-- から実効旋回半径を計算します。

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
	--------------------------------------------------
	-- 基本設定
	--------------------------------------------------

	GroundRayLength = 8,

	StartSpeed = 0,
	MaxSpeed = 100,
	StopSpeed = 0.8,

	--------------------------------------------------
	-- 雪面摩擦
	--------------------------------------------------

	DynamicFriction = 0.06,
	StaticFriction = 0.08,
	TuckFriction = 0.045,
	BrakeFriction = 0.32,

	-- 横滑り時の抵抗
	SideSlipFriction = 0.06,

	--------------------------------------------------
	-- カービングスキー
	--------------------------------------------------

	-- スキーの基準サイドカット半径
	-- 小さくすると、より小回りになります
	BaseSidecutRadius = 200,

	-- 最大エッジ角
	MaximumEdgeAngle = math.rad(68),

	-- キー入力からエッジ角が付く速さ
	EdgeEngagementSpeed = 8,

	-- キーを離したときに板がフラットへ戻る速さ
	EdgeReleaseSpeed = 5,

	-- カービングが効き始める速度
	MinimumCarveSpeed = 4,

	-- この速度でカービング効果が最大になる
	FullCarveSpeed = 55,

	-- 最低速時にも少し曲がれる補助
	LowSpeedSteeringRate = math.rad(45),

	-- 最大旋回角速度
	MaximumTurnRate = math.rad(150),

	--------------------------------------------------
	-- スキーのたわみ
	--------------------------------------------------

	-- 板の柔らかさ
	-- 大きいほど荷重で強く曲がります
	SkiFlexibility = 0.72,

	-- 速度によるたわみ
	SpeedFlexAmount = 0.72,

	-- 斜面角度によるたわみ
	SlopeFlexAmount = 0.25,

	-- カービング入力によるたわみ
	EdgeFlexAmount = 0.45,

	-- たわみによる旋回半径短縮量
	FlexTurnGain = 1.10,

	-- たわみの変化速度
	FlexResponseSpeed = 6,

	--------------------------------------------------
	-- カービング中の減速
	--------------------------------------------------

	-- 深いターンほど増える抵抗
	CarveDrag = 0.035,

	-- 急激なエッジ操作による抵抗
	EdgeChangeDrag = 0.018,

	--------------------------------------------------
	-- アニメーション
	--------------------------------------------------

	PoseBlendSpeed = 7,
	MinimumTurnPoseStrength = 0.7,
}

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

local activeSimulationConnection = nil

local animationTracks = {
	Straight = nil,
	Left = nil,
	Right = nil,
}

local currentPoseBlend = 0

local function updateInput(inputObject, isPressed)
	local actionName = keyToAction[inputObject.KeyCode]

	if actionName then
		inputState[actionName] = isPressed
	end
end

UserInputService.InputBegan:Connect(function(
	inputObject,
	gameProcessed
)
	if gameProcessed then
		return
	end

	updateInput(inputObject, true)
end)

UserInputService.InputEnded:Connect(function(inputObject)
	updateInput(inputObject, false)
end)

local function getSmoothAlpha(speed, deltaTime)
	return 1 - math.exp(-speed * deltaTime)
end

local function lerpNumber(a, b, alpha)
	return a + (b - a) * alpha
end

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

local function createOrientationController(rootPart)
	local oldAttachment =
		rootPart:FindFirstChild("SkiControlAttachment")

	if oldAttachment then
		oldAttachment:Destroy()
	end

	local oldAlignOrientation =
		rootPart:FindFirstChild("SkiAlignOrientation")

	if oldAlignOrientation then
		oldAlignOrientation:Destroy()
	end

	local attachment = Instance.new("Attachment")
	attachment.Name = "SkiControlAttachment"
	attachment.Parent = rootPart

	local alignOrientation = Instance.new("AlignOrientation")
	alignOrientation.Name = "SkiAlignOrientation"

	alignOrientation.Mode =
		Enum.OrientationAlignmentMode.OneAttachment

	alignOrientation.Attachment0 = attachment
	alignOrientation.RigidityEnabled = false

	alignOrientation.Responsiveness = 35

	alignOrientation.MaxTorque = 100000000
	alignOrientation.MaxAngularVelocity = 35
	alignOrientation.Parent = rootPart

	return alignOrientation
end

local function stopDefaultAnimations(character, humanoid)
	local animateScript =
		character:WaitForChild("Animate", 5)

	if animateScript
		and animateScript:IsA("LocalScript") then

		animateScript.Enabled = false
	end

	local animator =
		humanoid:FindFirstChildOfClass("Animator")

	if not animator then
		animator = Instance.new("Animator")
		animator.Parent = humanoid
	end

	for _, track in ipairs(
		animator:GetPlayingAnimationTracks()
		) do
		track:Stop(0.1)
	end

	return animator
end

local function loadAnimationTrack(
	animator,
	animationName,
	animationId
)
	local animation = Instance.new("Animation")
	animation.Name = animationName
	animation.AnimationId = animationId

	local success, result = pcall(function()
		return animator:LoadAnimation(animation)
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

local function setupCharacter(character)
	if activeSimulationConnection then
		activeSimulationConnection:Disconnect()
		activeSimulationConnection = nil
	end

	stopAnimationTracks()

	local humanoid =
		character:WaitForChild("Humanoid")

	local rootPart =
		character:WaitForChild("HumanoidRootPart")

	if humanoid.RigType
		~= Enum.HumanoidRigType.R15 then

		warn("このスキーシステムはR15用です。")
	end

	local animator =
		stopDefaultAnimations(
			character,
			humanoid
		)

	setupSkiAnimations(animator)

	humanoid.AutoRotate = false
	humanoid.WalkSpeed = 0
	humanoid.JumpPower = 0
	humanoid.JumpHeight = 0

	local alignOrientation =
		createOrientationController(rootPart)

	local raycastParams = RaycastParams.new()

	raycastParams.FilterType =
		Enum.RaycastFilterType.Exclude

	raycastParams.FilterDescendantsInstances = {
		character,
	}

	raycastParams.IgnoreWater = true

	local flatForward = Vector3.new(
		rootPart.CFrame.LookVector.X,
		0,
		rootPart.CFrame.LookVector.Z
	)

	local heading

	if flatForward.Magnitude > 0.01 then
		heading = flatForward.Unit
	else
		heading = Vector3.new(0, 0, -1)
	end

	local speed = CONFIG.StartSpeed
	local initialDownhillChosen = false

	local currentEdgeInput = 0

	local currentFlex = 0

	local previousEdgeInput = 0

	activeSimulationConnection =
		RunService.PreSimulation:Connect(
			function(deltaTime)
				if not character.Parent
					or not rootPart.Parent
					or humanoid.Health <= 0 then

					return
				end

				local raycastResult =
				Workspace:Raycast(
					rootPart.Position,
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

				rootPart.AssemblyLinearVelocity =
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

if player.Character then
	task.spawn(
		setupCharacter,
		player.Character
	)
end

player.CharacterAdded:Connect(
	setupCharacter
)
