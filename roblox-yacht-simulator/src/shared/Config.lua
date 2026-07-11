local Config = {}

Config.Modes = {
	Kids = {
		name = "キッズモード",
		autoSail = true,
		capsizeProtection = true,
		showGuide = true,
		heelLimit = 15,
		minAge = 7,
	},
	Normal = {
		name = "ノーマルモード",
		autoSail = false,
		capsizeProtection = false,
		showGuide = false,
		heelLimit = 45,
	},
	Pro = {
		name = "プロモード",
		autoSail = false,
		capsizeProtection = false,
		showGuide = false,
		heelLimit = 90,
		enableJib = true,
		enableHeelControl = true,
	},
}

Config.GameModes = {
	Race = { minPlayers = 2, maxPlayers = 24, duration = 600 },
	TimeAttack = { minPlayers = 1, maxPlayers = 1, duration = 300 },
	FreeMode = { minPlayers = 1, maxPlayers = 50, duration = 0 },
	ParentChild = { minPlayers = 2, maxPlayers = 2, duration = 600 },
	TeamRace = { minPlayers = 4, maxPlayers = 10, duration = 900 },
}

Config.Weather = {
	Clear = { windMultiplier = 1.0, waveHeight = 0.5, visibility = 1.0 },
	Cloudy = { windMultiplier = 0.9, waveHeight = 0.7, visibility = 0.8 },
	Sunset = { windMultiplier = 0.8, waveHeight = 0.6, visibility = 0.7 },
	Night = { windMultiplier = 0.7, waveHeight = 0.4, visibility = 0.3 },
	Rain = { windMultiplier = 1.3, waveHeight = 1.2, visibility = 0.5 },
	Storm = { windMultiplier = 2.0, waveHeight = 2.5, visibility = 0.2 },
	Typhoon = { windMultiplier = 3.0, waveHeight = 4.0, visibility = 0.1 },
}

Config.Boats = {
	Dinghy = {
		name = "ディンギー",
		maxSpeed = 40,
		turnRate = 2.5,
		stability = 0.8,
		crew = 1,
		unlockLevel = 0,
	},
	Laser = {
		name = "レーザー",
		maxSpeed = 50,
		turnRate = 2.0,
		stability = 0.6,
		crew = 1,
		unlockLevel = 5,
	},
	FourSevenZero = {
		name = "470級",
		maxSpeed = 55,
		turnRate = 1.8,
		stability = 0.7,
		crew = 2,
		unlockLevel = 10,
	},
	FortyNiner = {
		name = "49er",
		maxSpeed = 70,
		turnRate = 1.5,
		stability = 0.4,
		crew = 2,
		unlockLevel = 20,
	},
	Catamaran = {
		name = "カタマラン",
		maxSpeed = 80,
		turnRate = 1.2,
		stability = 0.9,
		crew = 2,
		unlockLevel = 30,
	},
	Keelboat = {
		name = "キールボート",
		maxSpeed = 45,
		turnRate = 1.0,
		stability = 1.0,
		crew = 6,
		unlockLevel = 15,
	},
	RacingYacht = {
		name = "レーシングヨット",
		maxSpeed = 60,
		turnRate = 0.8,
		stability = 0.85,
		crew = 10,
		unlockLevel = 40,
	},
}

Config.Courses = {
	Enoshima = { name = "江の島", position = Vector3.new(0, 0, 0), buoys = 6, difficulty = 1 },
	Hayama = { name = "葉山", position = Vector3.new(2000, 0, 0), buoys = 8, difficulty = 2 },
	Olympic = { name = "オリンピックコース", position = Vector3.new(4000, 0, 0), buoys = 10, difficulty = 3 },
	Sydney = { name = "シドニー", position = Vector3.new(6000, 0, 0), buoys = 8, difficulty = 2 },
	SanFrancisco = { name = "サンフランシスコ", position = Vector3.new(8000, 0, 0), buoys = 10, difficulty = 3 },
	Mediterranean = { name = "地中海", position = Vector3.new(10000, 0, 0), buoys = 12, difficulty = 4 },
	Hawaii = { name = "ハワイ", position = Vector3.new(12000, 0, 0), buoys = 8, difficulty = 2 },
}

Config.Physics = {
	waterDensity = 1025,
	airDensity = 1.225,
	gravity = 9.81,
	dragCoefficient = 0.05,
	liftCoefficient = 1.2,
	tackingPenalty = 0.3,
	tackingDuration = 2.0,
	jibingPenalty = 0.2,
	jibingDuration = 1.5,
}

Config.Lobby = {
	maxPlayers = 100,
	raceCountdown = 30,
}

return Config
