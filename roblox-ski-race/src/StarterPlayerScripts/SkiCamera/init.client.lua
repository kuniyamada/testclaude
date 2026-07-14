-- StarterPlayer
-- └─ StarterPlayerScripts
--    └─ SkiCamera
--
-- スキー用の追従カメラ
-- ・プレイヤーの後ろから追いかける
-- ・速度が上がると少し遠くなる
-- ・速度が上がると画角が広くなる
-- ・地面や壁にカメラが入り込むのを防ぐ

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer

local CONFIG = {
	-- 低速時のカメラ距離
	MinimumDistance = 6,

	-- 高速時のカメラ距離
	MaximumDistance = 15,

	-- カメラの高さ
	MinimumHeight = 5,

	-- 高速時のカメラの高さ
	MaximumHeight = 7,

	-- カメラが見る位置の高さ
	TargetHeight = 2.5,

	-- 進行方向の少し先を見る距離
	LookAheadDistance = 5,

	-- この速度で最大のカメラ変化になる
	SpeedForMaximumEffect = 100,

	-- 通常時の画角
	MinimumFieldOfView = 70,

	-- 高速時の画角
	MaximumFieldOfView = 86,

	-- カメラの追従速度
	PositionSmoothness = 7,

	-- 画角の変化速度
	FieldOfViewSmoothness = 5,

	-- 壁に当たったときの余白
	CollisionPadding = 0.8,
}

local camera = Workspace.CurrentCamera
local character = nil
local humanoidRootPart = nil

local currentCameraCFrame = nil
local currentFieldOfView =
	CONFIG.MinimumFieldOfView

local raycastParams = RaycastParams.new()

raycastParams.FilterType =
	Enum.RaycastFilterType.Exclude

raycastParams.IgnoreWater = true

-- 数値を0から1の間で補間する
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

-- フレームレートに左右されにくい
-- 滑らかな追従値を作る
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

-- キャラクターが出現したときの設定
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

	camera = Workspace.CurrentCamera
	camera.CameraType =
		Enum.CameraType.Scriptable

	currentCameraCFrame = nil

	currentFieldOfView =
		CONFIG.MinimumFieldOfView

	camera.FieldOfView =
		currentFieldOfView
end

-- 最初からキャラクターがいる場合
if player.Character then
	task.spawn(
		setupCharacter,
		player.Character
	)
end

-- リスポーンした場合
player.CharacterAdded:Connect(
	setupCharacter
)

RunService:BindToRenderStep(
	"SkiCameraUpdate",
	Enum.RenderPriority.Camera.Value + 1,
	function(deltaTime)
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

		-- 上下方向を除いた移動速度
		local horizontalVelocity =
			Vector3.new(
				velocity.X,
				0,
				velocity.Z
			)

		local horizontalSpeed =
			horizontalVelocity.Magnitude

		-- 速度によるカメラ変化量
		local speedRatio =
			math.clamp(
				horizontalSpeed
				/ CONFIG
				.SpeedForMaximumEffect,
				0,
				1
			)

		local forwardDirection

		-- 十分に移動している場合は、
		-- 実際の移動方向を使う
		if horizontalSpeed > 2 then
			forwardDirection =
				horizontalVelocity.Unit
		else
			-- 低速時はキャラクターの
			-- 向いている方向を使う
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

		-- カメラが見る位置
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

		-- カメラを置きたい位置
		local desiredCameraPosition =
			targetPosition
		- forwardDirection
			* cameraDistance
			+ Vector3.new(
				0,
				cameraHeight,
				0
			)

		-- プレイヤーとカメラの間に
		-- 壁や地面があるか調べる
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

		-- 速度が上がると画角を広げる
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
)
