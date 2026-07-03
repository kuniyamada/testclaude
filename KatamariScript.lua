-- KatamariScript
-- プレイヤーが操作するボール（Part）に入れると、
-- 触れた小さいオブジェクトがくっついて塊が大きくなる

local katamari = script.Parent

-- 設定
local growthRate = 0.05 -- くっつくたびに大きくなる割合
local minSizeRatio = 0.8 -- 自分のサイズに対してこの割合以下のオブジェクトをくっつける

-- くっつけたオブジェクトを記録
local attachedParts = {}

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

	-- 物理演算を無効化してくっつける
	part.CanCollide = false
	part.Anchored = false

	local weld = Instance.new("WeldConstraint")
	weld.Part0 = katamari
	weld.Part1 = part
	weld.Parent = katamari

	-- 塊を少し大きくする
	local growth = 1 + (growthRate * (partSize / katamariSize))
	katamari.Size = katamari.Size * growth

	-- 質量も増えるので転がる感覚が変わっていく
	if katamari:FindFirstChild("BodyMass") then
		katamari.BodyMass.Value = katamari.BodyMass.Value + part:GetMass()
	end
end

-- 接触イベント
katamari.Touched:Connect(function(hit)
	if hit and hit:IsA("BasePart") then
		attachPart(hit)
	end
end)
