local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage.Config)

local BoatModel = {}
BoatModel.__index = BoatModel

function BoatModel.new(boatType)
	local boatConfig = Config.Boats[boatType]
	assert(boatConfig, "Unknown boat type: " .. boatType)

	local self = setmetatable({}, BoatModel)
	self.boatType = boatType
	self.boatConfig = boatConfig
	self.model = nil
	self.mainSailBeams = {}
	self.jibBeams = {}
	self.mastAttachments = {}
	self.boomAttachment = nil
	self.currentBillow = 0
	return self
end

function BoatModel:create(position)
	local model = Instance.new("Model")
	model.Name = self.boatConfig.name

	-- 船体（Hull）
	local hull = Instance.new("Part")
	hull.Name = "Hull"
	hull.Size = Vector3.new(3, 1.5, 10)
	hull.Position = position
	hull.Anchored = true
	hull.CanCollide = true
	hull.Material = Enum.Material.WoodPlanks
	hull.Color = Color3.fromRGB(139, 90, 43)
	hull.Parent = model

	-- 船体の形（くさび型にするためWedgePartを前後に配置）
	local bow = Instance.new("WedgePart")
	bow.Name = "Bow"
	bow.Size = Vector3.new(3, 1.5, 4)
	bow.CFrame = CFrame.new(position + Vector3.new(0, 0, -7))
	bow.Anchored = true
	bow.CanCollide = true
	bow.Material = Enum.Material.WoodPlanks
	bow.Color = Color3.fromRGB(139, 90, 43)
	bow.Parent = model

	local stern = Instance.new("WedgePart")
	stern.Name = "Stern"
	stern.Size = Vector3.new(3, 1, 2)
	stern.CFrame = CFrame.new(position + Vector3.new(0, -0.25, 6)) * CFrame.Angles(0, math.rad(180), 0)
	stern.Anchored = true
	stern.CanCollide = true
	stern.Material = Enum.Material.WoodPlanks
	stern.Color = Color3.fromRGB(120, 75, 35)
	stern.Parent = model

	-- デッキ
	local deck = Instance.new("Part")
	deck.Name = "Deck"
	deck.Size = Vector3.new(2.8, 0.2, 9.5)
	deck.Position = position + Vector3.new(0, 0.85, 0)
	deck.Anchored = true
	deck.CanCollide = true
	deck.Material = Enum.Material.Wood
	deck.Color = Color3.fromRGB(180, 140, 80)
	deck.Parent = model

	-- マスト
	local mastHeight = 15
	local mast = Instance.new("Part")
	mast.Name = "Mast"
	mast.Size = Vector3.new(0.3, mastHeight, 0.3)
	mast.Position = position + Vector3.new(0, mastHeight / 2 + 1, -1)
	mast.Anchored = true
	mast.CanCollide = false
	mast.Material = Enum.Material.Metal
	mast.Color = Color3.fromRGB(200, 200, 210)
	mast.Parent = model

	-- ブーム（メインセイル下端）
	local boomLength = 7
	local boom = Instance.new("Part")
	boom.Name = "Boom"
	boom.Size = Vector3.new(0.2, 0.2, boomLength)
	boom.Position = position + Vector3.new(0, 2.5, -1 + boomLength / 2)
	boom.Anchored = true
	boom.CanCollide = false
	boom.Material = Enum.Material.Metal
	boom.Color = Color3.fromRGB(180, 180, 190)
	boom.Parent = model

	-- メインセイル（Beam方式 - 複数のBeamで構成）
	local sailSegments = 6
	local sailColor = ColorSequence.new(Color3.fromRGB(255, 255, 250))

	for i = 1, sailSegments do
		local t0 = (i - 1) / sailSegments
		local t1 = i / sailSegments

		-- マスト側のアタッチメント（上端・下端）
		local mastTop = Instance.new("Attachment")
		mastTop.Name = "MastAttach_" .. i .. "_top"
		local topY = mastHeight * (1 - t0) + 2.5 * t0
		mastTop.Position = Vector3.new(0, topY - mast.Position.Y, 0)
		mastTop.Parent = mast

		local mastBottom = Instance.new("Attachment")
		mastBottom.Name = "MastAttach_" .. i .. "_bottom"
		local bottomY = mastHeight * (1 - t1) + 2.5 * t1
		mastBottom.Position = Vector3.new(0, bottomY - mast.Position.Y, 0)
		mastBottom.Parent = mast

		-- セイル末端のアタッチメント（ブームまたは空中）
		local sailTip = Instance.new("Attachment")
		sailTip.Name = "SailTip_" .. i
		local tipZ = boomLength * (t0 + t1) / 2
		local tipY = 2.5 + (mastHeight - 2.5) * (1 - (t0 + t1) / 2) * 0.3
		if i == sailSegments then
			tipY = 2.5
			tipZ = boomLength * 0.9
			sailTip.Parent = boom
			sailTip.Position = Vector3.new(0, 0, tipZ - boomLength / 2)
		else
			sailTip.Parent = mast
			sailTip.Position = Vector3.new(0, tipY - mast.Position.Y, 0)
		end

		-- Beam（セイルの各セグメント）
		local beam = Instance.new("Beam")
		beam.Name = "MainSail_" .. i
		beam.Attachment0 = mastTop
		beam.Attachment1 = mastBottom
		beam.Color = sailColor
		beam.Transparency = NumberSequence.new(0.05)
		beam.LightEmission = 0.1
		beam.LightInfluence = 0.8
		beam.Width0 = 0.1
		beam.Width1 = boomLength * t1 * 0.8
		beam.CurveSize0 = 0
		beam.CurveSize1 = 0
		beam.FaceCamera = false
		beam.Segments = 10
		beam.Parent = mast

		table.insert(self.mainSailBeams, {
			beam = beam,
			segmentIndex = i,
			maxBillow = 2 + i * 0.5,
		})

		table.insert(self.mastAttachments, mastTop)
		table.insert(self.mastAttachments, mastBottom)
	end

	-- ジブセイル（前方の三角帆）
	local jibMastTop = Instance.new("Attachment")
	jibMastTop.Name = "JibTop"
	jibMastTop.Position = Vector3.new(0, mastHeight * 0.7 - mast.Position.Y, 0)
	jibMastTop.Parent = mast

	local jibBowTip = Instance.new("Attachment")
	jibBowTip.Name = "JibBow"
	jibBowTip.Position = Vector3.new(0, 0, -2)
	jibBowTip.Parent = bow

	local jibBeam = Instance.new("Beam")
	jibBeam.Name = "JibSail"
	jibBeam.Attachment0 = jibMastTop
	jibBeam.Attachment1 = jibBowTip
	jibBeam.Color = ColorSequence.new(Color3.fromRGB(240, 245, 255))
	jibBeam.Transparency = NumberSequence.new(0.05)
	jibBeam.LightEmission = 0.1
	jibBeam.LightInfluence = 0.8
	jibBeam.Width0 = 0.1
	jibBeam.Width1 = 4
	jibBeam.CurveSize0 = 0
	jibBeam.CurveSize1 = 0
	jibBeam.FaceCamera = false
	jibBeam.Segments = 8
	jibBeam.Parent = mast

	table.insert(self.jibBeams, {
		beam = jibBeam,
		maxBillow = 3,
	})

	-- ラダー（舵）
	local rudder = Instance.new("Part")
	rudder.Name = "Rudder"
	rudder.Size = Vector3.new(0.1, 2, 1)
	rudder.Position = position + Vector3.new(0, -0.5, 6)
	rudder.Anchored = true
	rudder.CanCollide = false
	rudder.Material = Enum.Material.Metal
	rudder.Color = Color3.fromRGB(100, 100, 110)
	rudder.Parent = model

	-- キール
	local keel = Instance.new("Part")
	keel.Name = "Keel"
	keel.Size = Vector3.new(0.2, 3, 2)
	keel.Position = position + Vector3.new(0, -2.25, 0)
	keel.Anchored = true
	keel.CanCollide = false
	keel.Material = Enum.Material.Metal
	keel.Color = Color3.fromRGB(80, 80, 90)
	keel.Parent = model

	-- 座席
	local seat = Instance.new("Seat")
	seat.Name = "HelmsmanSeat"
	seat.Size = Vector3.new(2, 0.5, 2)
	seat.Position = position + Vector3.new(0, 1.1, 3)
	seat.Anchored = true
	seat.Material = Enum.Material.Fabric
	seat.Color = Color3.fromRGB(50, 50, 120)
	seat.Parent = model

	model.PrimaryPart = hull
	self.model = model

	return model
end

function BoatModel:updateSailBillow(windSpeed, sailAngle, heelAngle)
	local billowAmount = math.clamp(windSpeed / 20, 0, 1)
	local sailAngleEffect = math.abs(math.sin(math.rad(sailAngle)))

	local targetBillow = billowAmount * sailAngleEffect
	self.currentBillow = self.currentBillow + (targetBillow - self.currentBillow) * 0.1

	local billowDirection = 1
	if sailAngle < 0 then
		billowDirection = -1
	end

	for _, sailData in ipairs(self.mainSailBeams) do
		local billow = self.currentBillow * sailData.maxBillow * billowDirection
		sailData.beam.CurveSize0 = billow * 0.3
		sailData.beam.CurveSize1 = billow
	end

	for _, jibData in ipairs(self.jibBeams) do
		local billow = self.currentBillow * jibData.maxBillow * billowDirection * 0.8
		jibData.beam.CurveSize0 = billow * 0.5
		jibData.beam.CurveSize1 = billow
	end
end

function BoatModel:updateTransform(position, heading, heelAngle, rudderAngle)
	if not self.model or not self.model.PrimaryPart then
		return
	end

	local lookAt = position + heading
	local baseCFrame = CFrame.lookAt(position, lookAt)

	local heelCFrame = CFrame.Angles(0, 0, math.rad(heelAngle))
	self.model:PivotTo(baseCFrame * heelCFrame)

	local rudder = self.model:FindFirstChild("Rudder")
	if rudder then
		local rudderCFrame = baseCFrame * CFrame.new(0, -0.5, 6) * CFrame.Angles(0, math.rad(-rudderAngle), 0)
		rudder.CFrame = rudderCFrame
	end
end

function BoatModel:setSailColor(color)
	local colorSeq = ColorSequence.new(color)
	for _, sailData in ipairs(self.mainSailBeams) do
		sailData.beam.Color = colorSeq
	end
	for _, jibData in ipairs(self.jibBeams) do
		jibData.beam.Color = colorSeq
	end
end

function BoatModel:setHullColor(color)
	if not self.model then
		return
	end
	local hull = self.model:FindFirstChild("Hull")
	if hull then
		hull.Color = color
	end
	local bow = self.model:FindFirstChild("Bow")
	if bow then
		bow.Color = color
	end
	local stern = self.model:FindFirstChild("Stern")
	if stern then
		stern.Color = color
	end
end

function BoatModel:destroy()
	if self.model then
		self.model:Destroy()
		self.model = nil
	end
	self.mainSailBeams = {}
	self.jibBeams = {}
	self.mastAttachments = {}
end

return BoatModel
