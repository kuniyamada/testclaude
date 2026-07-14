-- StarterPlayer
-- └─ StarterPlayerScripts
--    └─ SkiCamera
--
-- スキー用の追従カメラ
-- レース中のみ有効・レース外は通常カメラ

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer

local CONFIG = {
	MinimumDistance = 6,

	MaximumDistance = 15,

	MinimumHeight = 5,

	MaximumHeight = 7,

	TargetHeight = 2.5,

	LookAheadDistance = 5,

	SpeedForMaximumEffect = 100,

	MinimumFieldOfView = 70,

	MaximumFieldOfView = 86,

	PositionSmoothness = 7,

	FieldOfViewSmoothness = 5,

	CollisionPadding = 0.8,
}

local camera = Workspace.CurrentCamera
local character = nil
local humanoidRootPart = nil

local currentCameraCFrame = nil
local currentFieldOfView =
	CONFIG.MinimumFieldOfView

local cameraActive = false
local renderStepBound = false

local raycastParams = RaycastParams.new()

raycastParams.FilterType =
	Enum.RaycastFilterType.Exclude

raycastParams.IgnoreWater = true

local function lerpNumber(
	startValue,
	endValue,
	alpha
)
	return startValue
		+ (
			endValue
			- startValue
		) * alpha
end

local function getSmoothAlpha(
	smoothness,
	deltaTime
)
	return 1
	- math.exp(
		-smoothness
			* deltaTime
	)
end

--------------------------------------------------
-- カメラ更新
--------------------------------------------------

local function updateCamera(deltaTime)
	camera = Workspace.CurrentCamera

	if not camera then
		return
	end

	if not character
		or not character.Parent
		or not humanoidRootPart
		or not humanoidRootPart.Parent then

		return
	end

	camera.CameraType =
		Enum.CameraType.Scriptable

	local velocity =
		humanoidRootPart
		.AssemblyLinearVelocity

	local horizontalVelocity =
		Vector3.new(
			velocity.X,
			0,
			velocity.Z
		)

	local horizontalSpeed =
		horizontalVelocity.Magnitude

	local speedRatio =
		math.clamp(
			horizontalSpeed
			/ CONFIG
			.SpeedForMaximumEffect,
			0,
			1
		)

	local forwardDirection

	if horizontalSpeed > 2 then
		forwardDirection =
			horizontalVelocity.Unit
	else
		local lookVector =
			humanoidRootPart
			.CFrame.LookVector

		local flatLookVector =
			Vector3.new(
				lookVector.X,
				0,
				lookVector.Z
			)

		if flatLookVector.Magnitude > 0.01 then
			forwardDirection =
				flatLookVector.Unit
		else
			forwardDirection =
				Vector3.new(
					0,
					0,
					-1
				)
		end
	end

	local cameraDistance =
		lerpNumber(
			CONFIG.MinimumDistance,
			CONFIG.MaximumDistance,
			speedRatio
		)

	local cameraHeight =
		lerpNumber(
			CONFIG.MinimumHeight,
			CONFIG.MaximumHeight,
			speedRatio
		)

	local targetPosition =
		humanoidRootPart.Position
		+ Vector3.new(
			0,
			CONFIG.TargetHeight,
			0
		)
		+ forwardDirection
		* CONFIG.LookAheadDistance
		* speedRatio

	local desiredCameraPosition =
		targetPosition
	- forwardDirection
		* cameraDistance
		+ Vector3.new(
			0,
			cameraHeight,
			0
		)

	local cameraDirection =
		desiredCameraPosition
	- targetPosition

	local collisionResult =
		Workspace:Raycast(
			targetPosition,
			cameraDirection,
			raycastParams
		)

	if collisionResult then
		desiredCameraPosition =
			collisionResult.Position
			+ collisionResult.Normal
			* CONFIG.CollisionPadding
	end

	local desiredCameraCFrame =
		CFrame.lookAt(
			desiredCameraPosition,
			targetPosition,
			Vector3.yAxis
		)

	if not currentCameraCFrame then
		currentCameraCFrame =
			desiredCameraCFrame
	else
		local positionAlpha =
			getSmoothAlpha(
				CONFIG
				.PositionSmoothness,
				deltaTime
			)

		currentCameraCFrame =
			currentCameraCFrame:Lerp(
				desiredCameraCFrame,
				positionAlpha
			)
	end

	camera.CFrame =
		currentCameraCFrame

	local desiredFieldOfView =
		lerpNumber(
			CONFIG
			.MinimumFieldOfView,
			CONFIG
			.MaximumFieldOfView,
			speedRatio
		)

	local fieldOfViewAlpha =
		getSmoothAlpha(
			CONFIG
			.FieldOfViewSmoothness,
			deltaTime
		)

	currentFieldOfView =
		lerpNumber(
			currentFieldOfView,
			desiredFieldOfView,
			fieldOfViewAlpha
		)

	camera.FieldOfView =
		currentFieldOfView
end

--------------------------------------------------
-- カメラ開始・停止
--------------------------------------------------

local function startCamera()
	if cameraActive then
		return
	end

	cameraActive = true
	currentCameraCFrame = nil

	currentFieldOfView =
		CONFIG.MinimumFieldOfView

	camera = Workspace.CurrentCamera
	camera.CameraType =
		Enum.CameraType.Scriptable

	camera.FieldOfView =
		currentFieldOfView

	if not renderStepBound then
		RunService:BindToRenderStep(
			"SkiCameraUpdate",
			Enum.RenderPriority.Camera.Value + 1,
			updateCamera
		)

		renderStepBound = true
	end
end

local function stopCamera()
	if not cameraActive then
		return
	end

	cameraActive = false

	if renderStepBound then
		RunService:UnbindFromRenderStep(
			"SkiCameraUpdate"
		)

		renderStepBound = false
	end

	camera = Workspace.CurrentCamera

	if camera then
		camera.CameraType =
			Enum.CameraType.Custom

		camera.FieldOfView = 70
	end
end

--------------------------------------------------
-- RaceStatus監視
--------------------------------------------------

local function onStatusChanged(
	targetCharacter
)
	local status =
		targetCharacter:GetAttribute(
			"RaceStatus"
		)

	if status == "Racing" then
		startCamera()
	elseif status ~= "AtStart" then
		stopCamera()
	end
end

--------------------------------------------------
-- キャラクター設定
--------------------------------------------------

local function setupCharacter(
	newCharacter
)
	character = newCharacter

	humanoidRootPart =
		newCharacter:WaitForChild(
			"HumanoidRootPart"
		)

	raycastParams.FilterDescendantsInstances = {
		newCharacter,
	}

	newCharacter
		:GetAttributeChangedSignal(
			"RaceStatus"
		)
		:Connect(function()
			onStatusChanged(newCharacter)
		end)

	onStatusChanged(newCharacter)
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
