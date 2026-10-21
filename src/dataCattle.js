// Datos iniciales de Ganado Bovino de Alta Genética (Nelore, Brahman, Brangus, Girolando)
export const INITIAL_CATTLE_DATA = [
  {
    id: 'BOV-0842',
    name: 'Imperador FIV de Santa Cruz',
    earringNumber: 'SCZ-842',
    hbp: 'BOL-NEL-2024-9912',
    breed: 'Nelore Mocho PO',
    category: 'Toro Reproductor',
    gender: 'Macho',
    birthDate: '2023-04-12',
    weightKg: 890,
    status: 'Activo - En Colecta',
    location: 'Cabaña El Palmar - Piquete 1',
    auctionData: {
      auctionHouse: 'Remates Fexpocruz 2024',
      purchaseDate: '2024-09-18',
      totalPriceUsd: 18000,
      totalPriceBs: 125280,
      installmentsCount: 12,
      installmentValueUsd: 1500,
      installmentsPaid: 7,
      sellerCabaña: 'Cabaña Sausalito (Bolivia)'
    },
    pedigree: {
      father: {
        name: 'Kayack FIV Bela Vista',
        reg: 'BR-NEL-88190',
        origin: 'Uberaba (MG), Brasil 🇧🇷',
        notes: 'Gran Campeón ExpoZebu Brasil'
      },
      mother: {
        name: 'Doce FIV da Carpa',
        reg: 'BR-NEL-44210',
        origin: 'São Paulo, Brasil 🇧🇷',
        notes: 'Matriz Élite Donadora'
      },
      paternalGrandfather: {
        name: 'Basco da SM',
        reg: 'BR-NEL-00129'
      },
      paternalGrandmother: {
        name: 'Jalapa FIV da Bela',
        reg: 'BR-NEL-11822'
      },
      maternalGrandfather: {
        name: 'Bitelo da SS',
        reg: 'BR-NEL-99341'
      },
      maternalGrandmother: {
        name: 'Rancharia da Carpa',
        reg: 'BR-NEL-33120'
      }
    },
    reproduction: {
      method: 'Colecta de Semen & Monta Dirigida',
      lastInseminationDate: '2026-08-15',
      strawsInStock: 240,
      strawPriceUsd: 35,
      pregnancyConfirmedCount: 38
    },
    vaccines: [
      { name: 'Fiebre Aftosa Bivalente', applicationDate: '2026-05-10', nextDueDate: '2026-11-10', lot: 'AFT-2026-B9', vet: 'Dr. Fernando Prado (SENASAG)' },
      { name: 'Clostridiosis 10 Vías', applicationDate: '2026-06-02', nextDueDate: '2027-06-02', lot: 'CLS-8842', vet: 'Dra. Vanessa Aguilera' },
      { name: 'Complejo Reproductivo (IBR/DVB/Leptospira)', applicationDate: '2026-07-20', nextDueDate: '2027-01-20', lot: 'REP-551', vet: 'Dr. Fernando Prado' },
      { name: 'Rabia Paresiante Bovina', applicationDate: '2026-04-15', nextDueDate: '2027-04-15', lot: 'RAB-992', vet: 'SENASAG SCZ' }
    ],
    image: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'BOV-1205',
    name: 'Soberana FIV do Pantanal',
    earringNumber: 'SCZ-1205',
    hbp: 'BOL-NEL-2025-1104',
    breed: 'Nelore Padrão PO',
    category: 'Vaca Donadora (FIV)',
    gender: 'Hembra',
    birthDate: '2023-08-25',
    weightKg: 685,
    status: 'Preñada Confirmada',
    location: 'Cabaña El Palmar - Piquete Hembras Élite',
    auctionData: {
      auctionHouse: 'Gran Subasta Noche de Campeones',
      purchaseDate: '2025-04-10',
      totalPriceUsd: 14400,
      totalPriceBs: 100224,
      installmentsCount: 24,
      installmentValueUsd: 600,
      installmentsPaid: 18,
      sellerCabaña: 'Estância Bahia Remates (Brasil/Bolivia)'
    },
    pedigree: {
      father: {
        name: 'Rem Armador',
        reg: 'BR-NEL-77401',
        origin: 'Mato Grosso do Sul, Brasil 🇧🇷',
        notes: 'Líder en DEP de peso al destete y fertilidad'
      },
      mother: {
        name: 'Gobernadora FIV Sausalito',
        reg: 'BOL-NEL-33921',
        origin: 'Santa Cruz, Bolivia 🇧🇴',
        notes: 'Donadora Récord en Oocitos Aspirados'
      },
      paternalGrandfather: {
        name: 'Rem Torixoreu',
        reg: 'BR-NEL-44012'
      },
      paternalGrandmother: {
        name: 'Rem Rondeña',
        reg: 'BR-NEL-11234'
      },
      maternalGrandfather: {
        name: 'Landau da Di Genio',
        reg: 'BR-NEL-55891'
      },
      maternalGrandmother: {
        name: 'Electra da Sausalito',
        reg: 'BOL-NEL-11029'
      }
    },
    reproduction: {
      method: 'Inseminación Artificial a Tiempo Fijo (IATF)',
      bullUsed: 'Sherlock da Matinha (Semen Importado Brasil)',
      lastInseminationDate: '2026-07-14',
      pregnancyConfirmedDate: '2026-08-28',
      estimatedCalvingDate: '2027-04-20',
      status: 'Gestante 3 meses',
      strawsInStock: null
    },
    vaccines: [
      { name: 'Brucelosis Cepa 19 (Marcación V)', applicationDate: '2024-02-15', nextDueDate: 'Inmune Permanente', lot: 'BRU-19-SCZ', vet: 'Dr. Fernando Prado (SENASAG)' },
      { name: 'Fiebre Aftosa Bivalente', applicationDate: '2026-05-10', nextDueDate: '2026-11-10', lot: 'AFT-2026-B9', vet: 'SENASAG SCZ' },
      { name: 'Complejo Reproductivo Preventivo', applicationDate: '2026-06-25', nextDueDate: '2026-12-25', lot: 'REP-778', vet: 'Dra. Vanessa Aguilera' }
    ],
    image: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'BOV-2310',
    name: 'Mr. Barón Brahman Red 404',
    earringNumber: 'SCZ-2310',
    hbp: 'BOL-BRA-2024-0087',
    breed: 'Brahman Rojo Americano',
    category: 'Toro Reproductor',
    gender: 'Macho',
    birthDate: '2023-11-05',
    weightKg: 810,
    status: 'Activo en Paddock',
    location: 'Hacienda San Jerónimo - Potrero 4',
    auctionData: {
      auctionHouse: 'Remate Anual Cabaña Santa Ana',
      purchaseDate: '2025-08-22',
      totalPriceUsd: 9600,
      totalPriceBs: 66816,
      installmentsCount: 10,
      installmentValueUsd: 960,
      installmentsPaid: 10,
      sellerCabaña: 'Cabaña Santa Ana del Yacuma'
    },
    pedigree: {
      father: {
        name: 'VL Rojo Designer 2/75',
        reg: 'US-BRA-902188',
        origin: 'Texas, Estados Unidos 🇺🇸',
        notes: 'Campeón Mundial Brahman Rojo'
      },
      mother: {
        name: 'Lady Santa Ana Diamante 88',
        reg: 'BOL-BRA-44129',
        origin: 'Santa Cruz, Bolivia 🇧🇴',
        notes: 'Madre Sobresaliente ASOCEBU'
      },
      paternalGrandfather: {
        name: 'VL Rojo Grande 4/99',
        reg: 'US-BRA-11002'
      },
      paternalGrandmother: {
        name: 'VL Elena Te 30/4',
        reg: 'US-BRA-44882'
      },
      maternalGrandfather: {
        name: 'Mr. Winrock Red 112',
        reg: 'US-BRA-88912'
      },
      maternalGrandmother: {
        name: 'Miss Santa Ana 502',
        reg: 'BOL-BRA-22019'
      }
    },
    reproduction: {
      method: 'Monta a Campo & Protocolo IATF',
      lastInseminationDate: '2026-09-02',
      strawsInStock: 80,
      strawPriceUsd: 28,
      pregnancyConfirmedCount: 19
    },
    vaccines: [
      { name: 'Fiebre Aftosa Bivalente', applicationDate: '2026-05-10', nextDueDate: '2026-11-10', lot: 'AFT-2026-B9', vet: 'SENASAG SCZ' },
      { name: 'Carbunclo Bacteridiano (Antrax)', applicationDate: '2026-03-12', nextDueDate: '2027-03-12', lot: 'CAR-102', vet: 'Dr. Fernando Prado' },
      { name: 'Endectocida Desparasitación Prolongada', applicationDate: '2026-08-01', nextDueDate: '2026-11-01', lot: 'IVM-440', vet: 'Dra. Vanessa Aguilera' }
    ],
    image: 'https://images.unsplash.com/photo-1527153857715-3908f2ae5e81?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'BOV-3108',
    name: 'Esperanza FIV Girolando Plus',
    earringNumber: 'SCZ-3108',
    hbp: 'BOL-GIR-2025-4120',
    breed: 'Girolando 5/8 Holandés - 3/8 Gir',
    category: 'Vaca Lechera Alta Producción',
    gender: 'Hembra',
    birthDate: '2024-01-14',
    weightKg: 580,
    status: 'En Producción (32 Lts/día)',
    location: 'Módulo Lechero Automatizado 2',
    auctionData: {
      auctionHouse: 'Subasta Genética Lechera Minero',
      purchaseDate: '2025-11-04',
      totalPriceUsd: 7200,
      totalPriceBs: 50112,
      installmentsCount: 12,
      installmentValueUsd: 600,
      installmentsPaid: 11,
      sellerCabaña: 'Agropecuaria El Trébol'
    },
    pedigree: {
      father: {
        name: 'Teatro da Silvania (Gir Lechero)',
        reg: 'BR-GIR-99120',
        origin: 'Minas Gerais, Brasil 🇧🇷',
        notes: 'Líder Absoluto en Producción Lechera Brasil'
      },
      mother: {
        name: 'Trébol Holstein Queen 402',
        reg: 'BOL-HOL-22019',
        origin: 'Montero, Santa Cruz 🇧🇴',
        notes: 'Récord 42 litros/día en 2da lactancia'
      },
      paternalGrandfather: {
        name: 'Espantoso da Silvania',
        reg: 'BR-GIR-33120'
      },
      paternalGrandmother: {
        name: 'Nata da Silvania',
        reg: 'BR-GIR-88219'
      },
      maternalGrandfather: {
        name: 'Mainstream Manifold',
        reg: 'US-HOL-77120'
      },
      maternalGrandmother: {
        name: 'Trébol Queen 101',
        reg: 'BOL-HOL-88120'
      }
    },
    reproduction: {
      method: 'Inseminación Artificial con Semen Sexado Hembra',
      bullUsed: 'Gagarin FIV da Silvania',
      lastInseminationDate: '2026-08-30',
      pregnancyConfirmedDate: 'Pendiente Diagnóstico Ecográfico',
      estimatedCalvingDate: '2027-06-05',
      status: 'Inseminada (En Espera de Palpación)',
      strawsInStock: null
    },
    vaccines: [
      { name: 'Fiebre Aftosa Bivalente', applicationDate: '2026-05-10', nextDueDate: '2026-11-10', lot: 'AFT-2026-B9', vet: 'SENASAG SCZ' },
      { name: 'Mastitis Preventiva 9 Cepas', applicationDate: '2026-07-10', nextDueDate: '2027-01-10', lot: 'MAS-201', vet: 'Dr. Fernando Prado' },
      { name: 'Leptospirosis & IBR Reproductivo', applicationDate: '2026-08-10', nextDueDate: '2027-02-10', lot: 'LEP-992', vet: 'Dra. Vanessa Aguilera' }
    ],
    image: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=800&q=80'
  }
];

export const VACCINE_SCHEDULE_REFERENCE = [
  { name: 'Fiebre Aftosa Bivalente', period: 'Cada 6 meses (Ciclo Oficial SENASAG)', mandatory: true },
  { name: 'Brucelosis Bovina Cepa 19', period: 'Terneras 3 a 8 meses (Única dosis permanente)', mandatory: true },
  { name: 'Carbunclo Bacteridiano', period: 'Anual (Obligatorio zonas endémicas)', mandatory: true },
  { name: 'Clostridiosis Poli-valente', period: 'Anual en adultos / Revacunación terneros', mandatory: false },
  { name: 'Complejo Reproductivo IBR/DVB', period: 'Cada 6 meses en donadoras y toros', mandatory: false }
];
