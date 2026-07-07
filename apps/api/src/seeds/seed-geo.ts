import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

// Seed idempotente de la jerarquía de localización:
//   Países (catálogo mundial con prefijo telefónico) y, para España en
//   detalle: Comunidades autónomas (19) → Provincias (52) → una muestra de
//   municipios y códigos postales para poder recorrer la cadena completa en
//   el backoffice desde el primer arranque.
//
// Los códigos son los oficiales: ISO 3166-1 para el país (+ prefijo E.164) e
// INE para el desglose interno. El grueso de municipios y códigos postales
// (~8.100 y ~11.000) se importa por separado; aquí solo se siembran unas
// capitales de ejemplo.

const COUNTRY = {
  iso2: 'ES',
  iso3: 'ESP',
  numericCode: '724',
  name: 'España',
  nativeName: 'España',
  phoneCode: '+34',
};

// Catálogo de países con su prefijo telefónico internacional (ITU-T E.164).
// Formato: [iso2, iso3, nombre, prefijo]. Se siembran todos con `phoneCode`
// puesto; España lleva además numericCode/nativeName (ver constante COUNTRY).
const COUNTRIES: ReadonlyArray<[string, string, string, string]> = [
  // Europa
  ['AD', 'AND', 'Andorra', '+376'],
  ['AL', 'ALB', 'Albania', '+355'],
  ['AT', 'AUT', 'Austria', '+43'],
  ['BA', 'BIH', 'Bosnia y Herzegovina', '+387'],
  ['BE', 'BEL', 'Bélgica', '+32'],
  ['BG', 'BGR', 'Bulgaria', '+359'],
  ['BY', 'BLR', 'Bielorrusia', '+375'],
  ['CH', 'CHE', 'Suiza', '+41'],
  ['CY', 'CYP', 'Chipre', '+357'],
  ['CZ', 'CZE', 'Chequia', '+420'],
  ['DE', 'DEU', 'Alemania', '+49'],
  ['DK', 'DNK', 'Dinamarca', '+45'],
  ['EE', 'EST', 'Estonia', '+372'],
  ['ES', 'ESP', 'España', '+34'],
  ['FI', 'FIN', 'Finlandia', '+358'],
  ['FR', 'FRA', 'Francia', '+33'],
  ['GB', 'GBR', 'Reino Unido', '+44'],
  ['GR', 'GRC', 'Grecia', '+30'],
  ['HR', 'HRV', 'Croacia', '+385'],
  ['HU', 'HUN', 'Hungría', '+36'],
  ['IE', 'IRL', 'Irlanda', '+353'],
  ['IS', 'ISL', 'Islandia', '+354'],
  ['IT', 'ITA', 'Italia', '+39'],
  ['LI', 'LIE', 'Liechtenstein', '+423'],
  ['LT', 'LTU', 'Lituania', '+370'],
  ['LU', 'LUX', 'Luxemburgo', '+352'],
  ['LV', 'LVA', 'Letonia', '+371'],
  ['MC', 'MCO', 'Mónaco', '+377'],
  ['MD', 'MDA', 'Moldavia', '+373'],
  ['ME', 'MNE', 'Montenegro', '+382'],
  ['MK', 'MKD', 'Macedonia del Norte', '+389'],
  ['MT', 'MLT', 'Malta', '+356'],
  ['NL', 'NLD', 'Países Bajos', '+31'],
  ['NO', 'NOR', 'Noruega', '+47'],
  ['PL', 'POL', 'Polonia', '+48'],
  ['PT', 'PRT', 'Portugal', '+351'],
  ['RO', 'ROU', 'Rumanía', '+40'],
  ['RS', 'SRB', 'Serbia', '+381'],
  ['RU', 'RUS', 'Rusia', '+7'],
  ['SE', 'SWE', 'Suecia', '+46'],
  ['SI', 'SVN', 'Eslovenia', '+386'],
  ['SK', 'SVK', 'Eslovaquia', '+421'],
  ['SM', 'SMR', 'San Marino', '+378'],
  ['UA', 'UKR', 'Ucrania', '+380'],
  ['VA', 'VAT', 'Ciudad del Vaticano', '+39'],
  ['XK', 'XKX', 'Kosovo', '+383'],
  // América
  ['AG', 'ATG', 'Antigua y Barbuda', '+1'],
  ['AR', 'ARG', 'Argentina', '+54'],
  ['BB', 'BRB', 'Barbados', '+1'],
  ['BO', 'BOL', 'Bolivia', '+591'],
  ['BR', 'BRA', 'Brasil', '+55'],
  ['BS', 'BHS', 'Bahamas', '+1'],
  ['BZ', 'BLZ', 'Belice', '+501'],
  ['CA', 'CAN', 'Canadá', '+1'],
  ['CL', 'CHL', 'Chile', '+56'],
  ['CO', 'COL', 'Colombia', '+57'],
  ['CR', 'CRI', 'Costa Rica', '+506'],
  ['CU', 'CUB', 'Cuba', '+53'],
  ['DM', 'DMA', 'Dominica', '+1'],
  ['DO', 'DOM', 'República Dominicana', '+1'],
  ['EC', 'ECU', 'Ecuador', '+593'],
  ['GD', 'GRD', 'Granada', '+1'],
  ['GT', 'GTM', 'Guatemala', '+502'],
  ['GY', 'GUY', 'Guyana', '+592'],
  ['HN', 'HND', 'Honduras', '+504'],
  ['HT', 'HTI', 'Haití', '+509'],
  ['JM', 'JAM', 'Jamaica', '+1'],
  ['KN', 'KNA', 'San Cristóbal y Nieves', '+1'],
  ['LC', 'LCA', 'Santa Lucía', '+1'],
  ['MX', 'MEX', 'México', '+52'],
  ['NI', 'NIC', 'Nicaragua', '+505'],
  ['PA', 'PAN', 'Panamá', '+507'],
  ['PE', 'PER', 'Perú', '+51'],
  ['PY', 'PRY', 'Paraguay', '+595'],
  ['SR', 'SUR', 'Surinam', '+597'],
  ['SV', 'SLV', 'El Salvador', '+503'],
  ['TT', 'TTO', 'Trinidad y Tobago', '+1'],
  ['US', 'USA', 'Estados Unidos', '+1'],
  ['UY', 'URY', 'Uruguay', '+598'],
  ['VC', 'VCT', 'San Vicente y las Granadinas', '+1'],
  ['VE', 'VEN', 'Venezuela', '+58'],
  // Asia
  ['AE', 'ARE', 'Emiratos Árabes Unidos', '+971'],
  ['AF', 'AFG', 'Afganistán', '+93'],
  ['AM', 'ARM', 'Armenia', '+374'],
  ['AZ', 'AZE', 'Azerbaiyán', '+994'],
  ['BD', 'BGD', 'Bangladés', '+880'],
  ['BH', 'BHR', 'Baréin', '+973'],
  ['BN', 'BRN', 'Brunéi', '+673'],
  ['BT', 'BTN', 'Bután', '+975'],
  ['CN', 'CHN', 'China', '+86'],
  ['GE', 'GEO', 'Georgia', '+995'],
  ['ID', 'IDN', 'Indonesia', '+62'],
  ['IL', 'ISR', 'Israel', '+972'],
  ['IN', 'IND', 'India', '+91'],
  ['IQ', 'IRQ', 'Irak', '+964'],
  ['IR', 'IRN', 'Irán', '+98'],
  ['JO', 'JOR', 'Jordania', '+962'],
  ['JP', 'JPN', 'Japón', '+81'],
  ['KG', 'KGZ', 'Kirguistán', '+996'],
  ['KH', 'KHM', 'Camboya', '+855'],
  ['KP', 'PRK', 'Corea del Norte', '+850'],
  ['KR', 'KOR', 'Corea del Sur', '+82'],
  ['KW', 'KWT', 'Kuwait', '+965'],
  ['KZ', 'KAZ', 'Kazajistán', '+7'],
  ['LA', 'LAO', 'Laos', '+856'],
  ['LB', 'LBN', 'Líbano', '+961'],
  ['LK', 'LKA', 'Sri Lanka', '+94'],
  ['MM', 'MMR', 'Myanmar', '+95'],
  ['MN', 'MNG', 'Mongolia', '+976'],
  ['MV', 'MDV', 'Maldivas', '+960'],
  ['MY', 'MYS', 'Malasia', '+60'],
  ['NP', 'NPL', 'Nepal', '+977'],
  ['OM', 'OMN', 'Omán', '+968'],
  ['PH', 'PHL', 'Filipinas', '+63'],
  ['PK', 'PAK', 'Pakistán', '+92'],
  ['QA', 'QAT', 'Catar', '+974'],
  ['SA', 'SAU', 'Arabia Saudí', '+966'],
  ['SG', 'SGP', 'Singapur', '+65'],
  ['SY', 'SYR', 'Siria', '+963'],
  ['TH', 'THA', 'Tailandia', '+66'],
  ['TJ', 'TJK', 'Tayikistán', '+992'],
  ['TL', 'TLS', 'Timor Oriental', '+670'],
  ['TM', 'TKM', 'Turkmenistán', '+993'],
  ['TR', 'TUR', 'Turquía', '+90'],
  ['TW', 'TWN', 'Taiwán', '+886'],
  ['UZ', 'UZB', 'Uzbekistán', '+998'],
  ['VN', 'VNM', 'Vietnam', '+84'],
  ['YE', 'YEM', 'Yemen', '+967'],
  // África
  ['AO', 'AGO', 'Angola', '+244'],
  ['BF', 'BFA', 'Burkina Faso', '+226'],
  ['BI', 'BDI', 'Burundi', '+257'],
  ['BJ', 'BEN', 'Benín', '+229'],
  ['BW', 'BWA', 'Botsuana', '+267'],
  ['CD', 'COD', 'República Democrática del Congo', '+243'],
  ['CF', 'CAF', 'República Centroafricana', '+236'],
  ['CG', 'COG', 'Congo', '+242'],
  ['CI', 'CIV', 'Costa de Marfil', '+225'],
  ['CM', 'CMR', 'Camerún', '+237'],
  ['CV', 'CPV', 'Cabo Verde', '+238'],
  ['DJ', 'DJI', 'Yibuti', '+253'],
  ['DZ', 'DZA', 'Argelia', '+213'],
  ['EG', 'EGY', 'Egipto', '+20'],
  ['ER', 'ERI', 'Eritrea', '+291'],
  ['ET', 'ETH', 'Etiopía', '+251'],
  ['GA', 'GAB', 'Gabón', '+241'],
  ['GH', 'GHA', 'Ghana', '+233'],
  ['GM', 'GMB', 'Gambia', '+220'],
  ['GN', 'GIN', 'Guinea', '+224'],
  ['GQ', 'GNQ', 'Guinea Ecuatorial', '+240'],
  ['GW', 'GNB', 'Guinea-Bisáu', '+245'],
  ['KE', 'KEN', 'Kenia', '+254'],
  ['KM', 'COM', 'Comoras', '+269'],
  ['LR', 'LBR', 'Liberia', '+231'],
  ['LS', 'LSO', 'Lesoto', '+266'],
  ['LY', 'LBY', 'Libia', '+218'],
  ['MA', 'MAR', 'Marruecos', '+212'],
  ['MG', 'MDG', 'Madagascar', '+261'],
  ['ML', 'MLI', 'Malí', '+223'],
  ['MR', 'MRT', 'Mauritania', '+222'],
  ['MU', 'MUS', 'Mauricio', '+230'],
  ['MW', 'MWI', 'Malaui', '+265'],
  ['MZ', 'MOZ', 'Mozambique', '+258'],
  ['NA', 'NAM', 'Namibia', '+264'],
  ['NE', 'NER', 'Níger', '+227'],
  ['NG', 'NGA', 'Nigeria', '+234'],
  ['RW', 'RWA', 'Ruanda', '+250'],
  ['SC', 'SYC', 'Seychelles', '+248'],
  ['SD', 'SDN', 'Sudán', '+249'],
  ['SL', 'SLE', 'Sierra Leona', '+232'],
  ['SN', 'SEN', 'Senegal', '+221'],
  ['SO', 'SOM', 'Somalia', '+252'],
  ['SS', 'SSD', 'Sudán del Sur', '+211'],
  ['ST', 'STP', 'Santo Tomé y Príncipe', '+239'],
  ['SZ', 'SWZ', 'Esuatini', '+268'],
  ['TD', 'TCD', 'Chad', '+235'],
  ['TG', 'TGO', 'Togo', '+228'],
  ['TN', 'TUN', 'Túnez', '+216'],
  ['TZ', 'TZA', 'Tanzania', '+255'],
  ['UG', 'UGA', 'Uganda', '+256'],
  ['ZA', 'ZAF', 'Sudáfrica', '+27'],
  ['ZM', 'ZMB', 'Zambia', '+260'],
  ['ZW', 'ZWE', 'Zimbabue', '+263'],
  // Oceanía
  ['AU', 'AUS', 'Australia', '+61'],
  ['FJ', 'FJI', 'Fiyi', '+679'],
  ['FM', 'FSM', 'Micronesia', '+691'],
  ['KI', 'KIR', 'Kiribati', '+686'],
  ['MH', 'MHL', 'Islas Marshall', '+692'],
  ['NR', 'NRU', 'Nauru', '+674'],
  ['NZ', 'NZL', 'Nueva Zelanda', '+64'],
  ['PG', 'PNG', 'Papúa Nueva Guinea', '+675'],
  ['PW', 'PLW', 'Palaos', '+680'],
  ['SB', 'SLB', 'Islas Salomón', '+677'],
  ['TO', 'TON', 'Tonga', '+676'],
  ['TV', 'TUV', 'Tuvalu', '+688'],
  ['VU', 'VUT', 'Vanuatu', '+678'],
  ['WS', 'WSM', 'Samoa', '+685'],
];

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

  console.log(
    `→ Sembrando ${COUNTRIES.length} países con su prefijo telefónico...`,
  );
  for (const [iso2, iso3, name, phoneCode] of COUNTRIES) {
    await prisma.country.upsert({
      where: { iso2 },
      create: { iso2, iso3, name, phoneCode, isActive: true },
      update: { iso3, name, phoneCode },
    });
  }

  console.log('→ Completando detalle de España...');
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
    `✓ Seed de localización completado: ${COUNTRIES.length} países (con prefijo), ` +
      `${REGIONS.length} comunidades, ${PROVINCES.length} provincias, ` +
      `${MUNICIPALITIES.length} municipios, ${cpCount} códigos postales.`,
  );
  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
