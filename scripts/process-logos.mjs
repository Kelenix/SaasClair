// Prépare les logos fournis (JPEG sur fond gris) pour le web, sans les redessiner :
// détourage du fond, version inversée prévue par le brand kit, icônes d'application.
// Usage : node scripts/process-logos.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const CREAM = [250, 247, 240];
const OUT = "public/brand";
await mkdir(OUT, { recursive: true });

async function readRaw(file) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

// « Color to alpha » : retire une couleur de fond unie en conservant l'anticrénelage des bords.
// Le logo est plus sombre que son fond : les pixels plus clairs que le fond sont du bruit JPEG.
function colorToAlpha({ data, width, height }, bg) {
  const out = Buffer.alloc(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    const rgb = [data[p * 3], data[p * 3 + 1], data[p * 3 + 2]].map((c, k) => Math.min(c, bg[k]));
    const alpha = Math.max(...rgb.map((c, k) => (bg[k] - c) / bg[k]));
    const visible = alpha < 0.06 ? 0 : alpha;
    for (let k = 0; k < 3; k++) {
      out[p * 4 + k] = visible ? Math.round(bg[k] + (rgb[k] - bg[k]) / visible) : 0;
    }
    out[p * 4 + 3] = Math.round(visible * 255);
  }
  return out;
}

const toPng = (buffer, width, height) =>
  sharp(buffer, { raw: { width, height, channels: 4 } })
    .trim()
    .png({ compressionLevel: 9 });

// Logotype « SaasClair » : fond détouré + version inversée (Saas en crème) pour le vert forêt.
{
  const image = await readRaw("Logo SaaS Clair.jpeg");
  const bg = [...image.data.subarray(0, 3)];
  const rgba = colorToAlpha(image, bg);
  await toPng(rgba, image.width, image.height).toFile(`${OUT}/wordmark.png`);

  const inverse = Buffer.from(rgba);
  for (let i = 0; i < inverse.length; i += 4) {
    const isForest = inverse[i + 1] < 110; // le vert forêt est sombre, l'émeraude est claire
    if (inverse[i + 3] && isForest) CREAM.forEach((c, k) => (inverse[i + k] = c));
  }
  await toPng(inverse, image.width, image.height).toFile(`${OUT}/wordmark-inverse.png`);
}

// Monogramme : on garde la tuile crème d'origine et on retire le fond gris autour (masque arrondi).
{
  const image = await readRaw("Logo SaaS .jpeg");
  const isTile = (x, y) => {
    const i = (y * image.width + x) * 3;
    return image.data[i] - image.data[i + 2] > 4; // la tuile crème est chaude, le fond est gris neutre
  };
  const mid = image.width >> 1;
  const scan = (from, step, at) => {
    for (let t = from; ; t += step) if (at(t)) return t;
  };
  const left = scan(0, 1, (x) => isTile(x, mid));
  const right = scan(image.width - 1, -1, (x) => isTile(x, mid));
  const top = scan(0, 1, (y) => isTile(mid, y));
  const bottom = scan(image.height - 1, -1, (y) => isTile(mid, y));
  const diagonal = scan(0, 1, (t) => isTile(left + t, top + t));
  const radius = Math.round(diagonal / (1 - Math.SQRT1_2));
  const width = right - left + 1;
  const height = bottom - top + 1;
  const mask = Buffer.from(
    `<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" fill="#fff"/></svg>`,
  );
  const tile = await sharp("Logo SaaS .jpeg")
    .extract({ left, top, width, height })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

  await sharp(tile).resize(512, 512).toFile(`${OUT}/monogram.png`);
  await sharp(tile).resize(512, 512).toFile("src/app/icon.png");
  await sharp(tile)
    .resize(180, 180)
    .flatten({ background: "#FAF7F0" })
    .toFile("src/app/apple-icon.png");
  console.log({ left, right, top, bottom, radius });
}

// Image de partage (réseaux sociaux) : fond vert forêt, logo inversé, titre court.
{
  const width = 1200;
  const height = 630;
  const background = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#064E3B"/>
      <circle cx="1080" cy="40" r="245" fill="none" stroke="#10B981" stroke-opacity="0.14" stroke-width="70"/>
      <text x="80" y="330" font-family="Georgia, serif" font-size="66" font-weight="600" fill="#FAF7F0">Comprenez votre SaaS en</text>
      <text x="80" y="410" font-family="Georgia, serif" font-size="66" font-weight="600" fill="#FAF7F0"><tspan fill="#10B981">5 minutes</tspan>, pas en 5 semaines.</text>
      <text x="80" y="520" font-family="Arial, sans-serif" font-size="28" fill="#FAF7F0" fill-opacity="0.75">Captez plus de clients, gardez-les plus longtemps.</text>
    </svg>`,
  );
  const logo = await sharp(`${OUT}/wordmark-inverse.png`).resize({ height: 64 }).toBuffer();
  await sharp(background)
    .composite([{ input: logo, left: 80, top: 90 }])
    .png()
    .toFile("src/app/opengraph-image.png");
}
