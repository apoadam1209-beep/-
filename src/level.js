/* ===== بناء المرحلة (الغابة) — يتكيّف مع ارتفاع الشاشة ===== */
function buildLevel(H) {
  var groundTop = H - 90;
  var W = 3900;

  var plats = [];
  function ground(x0, x1) { plats.push({ x: x0, y: groundTop, w: x1 - x0, h: H - groundTop }); }

  // أرضية متقطّعة (الفجوات = حفر)
  ground(0, 760);
  ground(900, 1700);
  ground(1850, 2720);
  ground(2880, W);

  // منصّات عائمة متدرّجة (سلالم للتسلّق)
  plats.push({ x: 520,  y: groundTop - 100, w: 170, h: 40 });
  plats.push({ x: 1010, y: groundTop - 200, w: 170, h: 40 });
  plats.push({ x: 1380, y: groundTop - 300, w: 170, h: 40 });
  plats.push({ x: 2240, y: groundTop - 320, w: 180, h: 40 });
  plats.push({ x: 3000, y: groundTop - 180, w: 210, h: 40 });

  // منصّات سقف (تُجمع عبر عكس الجاذبية)
  plats.push({ x: 1240, y: 120, w: 210, h: 40 });
  plats.push({ x: 2380, y: 120, w: 230, h: 40 });

  var parts = [
    new Part(600,  groundTop - 150),
    new Part(1090, groundTop - 250),
    new Part(1450, groundTop - 350),
    new Part(2310, groundTop - 370),
    new Part(1330, 165),            // على منصّة السقف (عكس الجاذبية)
    new Part(3080, groundTop - 230)
  ];

  var humans = [
    new Human(380,  groundTop - 54, 90),
    new Human(1250, groundTop - 54, 110),
    new Human(2050, groundTop - 54, 120),
    new Human(3050, groundTop - 54, 120)
  ];
  // مطاردان أسرع وأوسع رؤية لزيادة الإثارة
  humans[1].speed = 135; humans[1].visionRange = 360; humans[1].fov = 0.85; humans[1].chaseMul = 2.6;
  humans[3].speed = 125; humans[3].visionRange = 340; humans[3].chaseMul = 2.3;

  var cams = [
    new Cam(1000, 64, Math.PI / 2, 320),
    new Cam(2520, 64, Math.PI / 2, 340)
  ];

  var cells = [
    new EnergyCell(600,  groundTop - 140),
    new EnergyCell(2310, groundTop - 360),
    new EnergyCell(3080, groundTop - 220)
  ];

  // شعلات جدارية (إضاءة سينمائية)
  var torches = [300, 1100, 1700, 2500, 3300].map(function (x) { return { x: x, y: groundTop }; });
  // فخاخ أشواك على الأرض (يجب القفز فوقها)
  var spikes = [
    { x: 1300, y: groundTop - 18, w: 84, h: 18 },
    { x: 2050, y: groundTop - 18, w: 92, h: 18 },
    { x: 2980, y: groundTop - 18, w: 84, h: 18 }
  ];

  return {
    worldW: W, worldH: H, groundTop: groundTop,
    platforms: plats, parts: parts, humans: humans, cams: cams, cells: cells,
    torches: torches, spikes: spikes,
    spawn: { x: 60, y: groundTop - 50 },
    ship: { x: 3520, y: groundTop - 130 }
  };
}
