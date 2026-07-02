-- ColorChangingScript
-- このスクリプトをPartの中に入れると、色が自動で変化します

local part = script.Parent

local colors = {
	Color3.fromRGB(255, 0, 0),     -- 赤
	Color3.fromRGB(255, 165, 0),   -- オレンジ
	Color3.fromRGB(255, 255, 0),   -- 黄
	Color3.fromRGB(0, 255, 0),     -- 緑
	Color3.fromRGB(0, 150, 255),   -- 水色
	Color3.fromRGB(0, 0, 255),     -- 青
	Color3.fromRGB(150, 0, 255),   -- 紫
}

local interval = 1 -- 色が変わる間隔（秒）

while true do
	for i, color in ipairs(colors) do
		part.Color = color
		task.wait(interval)
	end
end
