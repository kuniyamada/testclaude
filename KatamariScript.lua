-- KatamariScript
-- プレイヤーが操作するボール（Part）に入れると、
-- 触れた小さいオブジェクトがくっついて塊が大きくなる

local katamari = script.Parent

-- 設定
local growthRate = 0.05 -- くっつくたびにベース球が大きくなる割合
local minSizeRatio = 0.8 -- 自分のサイズに対してこの割合以下のオブジェクトをくっつける
local gravityMultiplier = 0.2 -- 重力を2割にする（かなり軽い）

-- くっつけたオブジェクトを記録
local attachedParts = {}
local attachCount = 0

-- ベース球の重力を半分にする
local bodyForce = Instance.new("BodyForce")
local mass = katamari:GetMass()
local halfGravity = workspace.Gravity * mass * (1 - gravityMultiplier)
bodyForce.Force = Vector3.new(0, halfGravity, 0)
bodyForce.Parent = katamari

-- 塊の現在のサイズ（最大辺で判定）
local function getKatamariSize()
	return math.max(katamari.Size.X, katamari.Size.Y, katamari.Size.Z)
end

-- オブジェクトのサイズ（最大辺）
local function getPartSize(part)
	return math.max(part.Size.X, part.Size.Y, part.Size.Z)
end

-- オブジェクトをくっつける
local function attachPart(part)
	if attachedParts[part] then return end
	if part.Anchored then return end
	if part:IsDescendantOf(katamari) then return end

	-- プレイヤーキャラクターのパーツは除外
	for _, player in ipairs(game:GetService("Players"):GetPlayers()) do
		if player.Character and part:IsDescendantOf(player.Character) then
			return
		end
	end

	-- サイズ判定：自分より小さいものだけくっつく
	local katamariSize = getKatamariSize()
	local partSize = getPartSize(part)
	if partSize > katamariSize * minSizeRatio then return end

	attachedParts[part] = true
	attachCount = attachCount + 1

	-- 物理演算を調整してくっつける
	part.CanCollide = false
	part.Anchored = false
	part.Massless = true

	-- 球の表面にバランスよく配置する（黄金角を使った均等分布）
	local goldenAngle = math.pi * (3 - math.sqrt(5))
	local theta = goldenAngle * attachCount
	local phi = math.acos(1 - 2 * ((attachCount % 50) + 0.5) / 50)

	local radius = getKatamariSize() / 2 + getPartSize(part) / 2
	local x = radius * math.sin(phi) * math.cos(theta)
	local y = radius * math.sin(phi) * math.sin(theta)
	local z = radius * math.cos(phi)

	local offset = Vector3.new(x, y, z)

	part.CFrame = katamari.CFrame * CFrame.new(offset)

	local weld = Instance.new("WeldConstraint")
	weld.Part0 = katamari
	weld.Part1 = part
	weld.Parent = katamari

	-- ベース球を徐々に大きくする
	local growth = 1 + (growthRate * (partSize / katamariSize))
	katamari.Size = katamari.Size * growth

	-- サイズが変わったので重力補正を再計算
	local newMass = katamari:GetMass()
	local newHalfGravity = workspace.Gravity * newMass * (1 - gravityMultiplier)
	bodyForce.Force = Vector3.new(0, newHalfGravity, 0)
end

-- 接触イベント
katamari.Touched:Connect(function(hit)
	if hit and hit:IsA("BasePart") then
		attachPart(hit)
	end
end)
