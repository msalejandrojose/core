import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

// Seed idempotente de la jerarquía de localización de España:
//   País (España) → Comunidades autónomas (19) → Provincias (52) →
//   una muestra de municipios y códigos postales para poder recorrer la
//   cadena completa en el backoffice desde el primer arranque.
//
// Los códigos son los oficiales: ISO 3166-1 para el país e INE para el
// desglose interno. El grueso de municipios y códigos postales (~8.100 y
// ~11.000) se importa por separado; aquí solo se siembran unas capitales de
// ejemplo.

const COUNTRY = {
  iso2: 'ES',
  iso3: 'ESP',
  numericCode: '724',
  name: 'España',
  nativeName: 'España',
  phoneCode: '+34',
};

// Comunidades autónomas — [código INE, nombre]
const REGIONS: ReadonlyArray<[string, string]> = [
  ['01', 'Andalucía'],
  ['02', 'Aragón'],
  ['03', 'Principado de Asturias'],
  ['04', 'Illes Balears'],
  ['05', 'Canarias'],
  ['06', 'Cantabria'],
  ['07', 'Castilla y León'],
  ['08', 'Castilla-La Mancha'],
  ['09', 'Cataluña'],
  ['10', 'Comunitat Valenciana'],
  ['11', 'Extremadura'],
  ['12', 'Galicia'],
  ['13', 'Comunidad de Madrid'],
  ['14', 'Región de Murcia'],
  ['15', 'Comunidad Foral de Navarra'],
  ['16', 'País Vasco'],
  ['17', 'La Rioja'],
  ['18', 'Ceuta'],
  ['19', 'Melilla'],
];

// Provincias — [código INE, nombre, código INE de la comunidad autónoma]
const PROVINCES: ReadonlyArray<[string, string, string]> = [
  ['01', 'Araba/Álava', '16'],
  ['02', 'Albacete', '08'],
  ['03', 'Alicante/Alacant', '10'],
  ['04', 'Almería', '01'],
  ['05', 'Ávila', '07'],
  ['06', 'Badajoz', '11'],
  ['07', 'Illes Balears', '04'],
  ['08', 'Barcelona', '09'],
  ['09', 'Burgos', '07'],
  ['10', 'Cáceres', '11'],
  ['11', 'Cádiz', '01'],
  ['12', 'Castellón/Castelló', '10'],
  ['13', 'Ciudad Real', '08'],
  ['14', 'Córdoba', '01'],
  ['15', 'A Coruña', '12'],
  ['16', 'Cuenca', '08'],
  ['17', 'Girona', '09'],
  ['18', 'Granada', '01'],
  ['19', 'Guadalajara', '08'],
  ['20', 'Gipuzkoa', '16'],
  ['21', 'Huelva', '01'],
  ['22', 'Huesca', '02'],
  ['23', 'Jaén', '01'],
  ['24', 'León', '07'],
  ['25', 'Lleida', '09'],
  ['26', 'La Rioja', '17'],
  ['27', 'Lugo', '12'],
  ['28', 'Madrid', '13'],
  ['29', 'Málaga', '01'],
  ['30', 'Murcia', '14'],
  ['31', 'Navarra', '15'],
  ['32', 'Ourense', '12'],
  ['33', 'Asturias', '03'],
  ['34', 'Palencia', '07'],
  ['35', 'Las Palmas', '05'],
  ['36', 'Pontevedra', '12'],
  ['37', 'Salamanca', '07'],
  ['38', 'Santa Cruz de Tenerife', '05'],
  ['39', 'Cantabria', '06'],
  ['40', 'Segovia', '07'],
  ['41', 'Sevilla', '01'],
  ['42', 'Soria', '07'],
  ['43', 'Tarragona', '09'],
  ['44', 'Teruel', '02'],
  ['45', 'Toledo', '08'],
  ['46', 'Valencia/València', '10'],
  ['47', 'Valladolid', '07'],
  ['48', 'Bizkaia', '16'],
  ['49', 'Zamora', '07'],
  ['50', 'Zaragoza', '02'],
  ['51', 'Ceuta', '18'],
  ['52', 'Melilla', '19'],
];

// Muestra de municipios — [código INE, nombre, código de provincia, [CPs]]
const MUNICIPALITIES: ReadonlyArray<[string, string, string, string[]]> = [
  ['28079', 'Madrid', '28', ['28001', '28013', '28045']],
  ['08019', 'Barcelona', '08', ['08001', '08002']],
  ['46250', 'València', '46', ['46001', '46002']],
  ['41091', 'Sevilla', '41', ['41001', '41004']],
  ['29067', 'Málaga', '29', ['29001']],
  ['48020', 'Bilbao', '48', ['48001']],
];

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  const prisma = app.get(PrismaService);

  console.log('→ Sembrando país (España)...');
  const country = await prisma.country.upsert({
    where: { iso2: COUNTRY.iso2 },
    create: { ...COUNTRY, isActive: true },
    update: {
      iso3: COUNTRY.iso3,
      numericCode: COUNTRY.numericCode,
      name: COUNTRY.name,
      nativeName: COUNTRY.nativeName,
      phoneCode: COUNTRY.phoneCode,
      isActive: true,
    },
  });

  console.log(`→ Sembrando ${REGIONS.length} comunidades autónomas...`);
  const regionIdByCode = new Map<string, string>();
  for (const [code, name] of REGIONS) {
    const region = await prisma.region.upsert({
      where: { countryId_code: { countryId: country.id, code } },
      create: { code, name, countryId: country.id },
      update: { name },
    });
    regionIdByCode.set(code, region.id);
  }

  console.log(`→ Sembrando ${PROVINCES.length} provincias...`);
  const provinceIdByCode = new Map<string, string>();
  for (const [code, name, regionCode] of PROVINCES) {
    const province = await prisma.province.upsert({
      where: { countryId_code: { countryId: country.id, code } },
      create: {
        code,
        name,
        countryId: country.id,
        regionId: regionIdByCode.get(regionCode) ?? null,
      },
      update: { name, regionId: regionIdByCode.get(regionCode) ?? null },
    });
    provinceIdByCode.set(code, province.id);
  }

  console.log(`→ Sembrando ${MUNICIPALITIES.length} municipios de ejemplo...`);
  let cpCount = 0;
  for (const [code, name, provinceCode, postalCodes] of MUNICIPALITIES) {
    const provinceId = provinceIdByCode.get(provinceCode);
    if (!provinceId) continue;
    const municipality = await prisma.municipality.upsert({
      where: { provinceId_code: { provinceId, code } },
      create: { code, name, provinceId },
      update: { name },
    });
    for (const cp of postalCodes) {
      await prisma.postalCode.upsert({
        where: {
          municipalityId_code: { municipalityId: municipality.id, code: cp },
        },
        create: { code: cp, municipalityId: municipality.id },
        update: {},
      });
      cpCount++;
    }
  }

  console.log('');
  console.log(
    `✓ Seed de localización completado: 1 país, ${REGIONS.length} comunidades, ` +
      `${PROVINCES.length} provincias, ${MUNICIPALITIES.length} municipios, ${cpCount} códigos postales.`,
  );
  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
