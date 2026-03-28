import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Type } from "@google/genai";
import { 
  Leaf, 
  Droplets, 
  Sun, 
  Calendar, 
  Plus, 
  Search, 
  Settings, 
  LogOut, 
  Thermometer, 
  Wind, 
  CloudRain,
  Camera,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  LayoutDashboard,
  Sprout,
  MapPin,
  History,
  Package,
  FlaskConical,
  ClipboardList,
  BookOpen,
  FileText,
  ThermometerSun,
  Droplets as Water,
  Layers,
  Box,
  History as LogsIcon,
  Package as StockIcon,
  Download,
  Upload,
  RefreshCw,
  Scan,
  Bug,
  Cloud,
  ShieldCheck,
  PackageSearch,
  FileJson,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getGeminiClient, getGeminiErrorMessage, saveGeminiKeyLocally, clearGeminiKeyLocally, getSavedGeminiKey } from './lib/gemini';

// --- Types ---
interface PlantPhotoEntry {
  id: string;
  date: string;
  image: string;
  note?: string;
  source?: string;
}

interface Plant {
  id: string;
  name: string;
  species?: string;
  locationId: string;
  status: 'Saudável' | 'Recuperação' | 'Problema' | 'Muda';
  wateringFrequency: string;
  lastWatered?: string;
  lastRepotted?: string;
  notes?: string;
  image?: string;
  potSize?: string;
  substrateMix?: string;
  drainageLayer?: string;
  substrate?: string;
  drainage?: string;
  filterMaterial?: string;
  isFavorite?: boolean;
  createdAt?: string;
  photoHistory?: PlantPhotoEntry[];
  symptomNotes?: string;
  probableDiagnosis?: string;
  possibleTreatment?: string;
  diagnosisUpdatedAt?: string;
}

interface Log {
  id: string;
  plantId: string;
  date: string;
  action: 'Rega' | 'Poda' | 'Adubação' | 'Troca de Vaso' | 'Problema' | 'Outro';
  notes: string;
}

interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  category: string;
  usageTags?: string[];
  notes?: string;
  image?: string;
  locationId?: string;
}

interface Germination {
  id: string;
  name: string;
  species?: string;
  startDate: string;
  expectedDays: number;
  status: 'Em andamento' | 'Sucesso' | 'Falha' | 'Transferida';
  notes?: string;
  lastWatered?: string;
  hydratedWithWarmWater?: boolean;
  image?: string;
  plantingInstructions?: string;
  stockSuggestions?: string;
  germinationTechniques?: string;
  hydrationInstructions?: string;
  recommendedLight?: string;
  wateringTips?: string;
  transferredPlantId?: string;
  transferredAt?: string;
  locationId?: string;
}

interface HistoryItem {
  id: string;
  type: 'Identificação' | 'Semente' | 'Diagnóstico' | 'Rega' | 'Replantio' | 'Atualização';
  date: string;
  title: string;
  details: string;
  image?: string;
  plantId?: string;
}

interface Task {
  id: string;
  title: string;
  date: string;
  completed: boolean;
  plantId?: string;
}

interface Location {
  id: string;
  name: string;
  light: string;
  exposure: string;
  covered?: boolean;
  receivesRain?: boolean;
  sunPeriod?: string;
  notes?: string;
  image?: string;
}

interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  wind: number;
  rainProb: number;
  locationName: string;
}

interface ForecastData {
  tempMax: number;
  tempMin: number;
  condition: string;
  rainProb: number;
}

interface RankedLocationMatch {
  id: string;
  name: string;
  score: number;
  label: 'Ideal' | 'Boa opção' | 'Atenção';
  reason: string;
}

interface EnvironmentRecommendation {
  best?: RankedLocationMatch;
  current?: RankedLocationMatch;
  ranked: RankedLocationMatch[];
}

interface LightAnalysisResult {
  level: string;
  sunPeriod: string;
  explanation: string;
  tip: string;
  middayTip: string;
}

interface AppSettings {
  weatherMode: 'auto' | 'manual';
  gardenAddress: string;
  lat?: number;
  lng?: number;
  geminiApiKey?: string;
}

interface GardenAlert {
  id: string;
  title: string;
  details: string;
  severity: 'alta' | 'media' | 'baixa';
  category: 'Plantas' | 'Estoque' | 'Germinação' | 'Clima' | 'Tarefas';
  targetTab?: string;
  createdAt?: string;
}

interface StockRecommendationItem {
  key: 'substrate' | 'drainage' | 'filterMaterial' | 'potSize';
  label: string;
  recommended: string;
  inventoryItem?: string;
  status: 'available' | 'missing' | 'current';
  hint: string;
  applyValue?: string;
}

interface StockRecommendationBundle {
  summary: string;
  items: StockRecommendationItem[];
  patch: Partial<Plant>;
}

interface DailyGardenInsights {
  dayKey: string;
  weekKey: string;
  source: 'gemini' | 'local' | 'cache';
  botanistOfDay: string;
  priorities: string[];
  checklist: string[];
  maintenanceAdvice: string;
  routineTips: string;
  riskAnalysis: string;
  germinationGuidance: string;
  repotAdvice: string;
  climateManagement: string;
  weeklyReview: string;
  newPlantsAdvice: string;
  oldPlantsAdvice: string;
  stockMixAdvice: string;
  report: string;
}

const UNKNOWN_OPTION = '-';
const PLANT_STATUS_OPTIONS: Plant['status'][] = ['Saudável', 'Recuperação', 'Problema', 'Muda'];
const WATERING_OPTIONS = ['Diária', 'Semanal', 'Quinzenal', 'Mensal'];
const POT_OPTIONS = [UNKNOWN_OPTION, 'Copo/mini vaso', 'Pequeno', 'Médio', 'Grande', 'Jardineira'];
const SUBSTRATE_OPTIONS = [UNKNOWN_OPTION, 'Terra vegetal', 'Terra + húmus', 'Substrato para folhagens', 'Substrato para suculentas', 'Terra + areia', 'Casca de pinus + perlita'];
const DRAINAGE_OPTIONS = [UNKNOWN_OPTION, 'Sem drenagem extra', 'Argila expandida', 'Brita', 'Areia grossa', 'Carvão vegetal'];
const FILTER_OPTIONS = [UNKNOWN_OPTION, 'Sem manta', 'Manta bidim', 'Tela plástica', 'Filtro de café'];

const LOCAL_IMAGE_MAX_DIMENSION = 960;
const LOCAL_IMAGE_QUALITY = 0.72;

const safeLocalStorageSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Não consegui salvar ${key} no armazenamento local.`, error);
    return false;
  }
};

const readFileAsOptimizedDataUrl = async (file: File, maxDimension = LOCAL_IMAGE_MAX_DIMENSION, quality = LOCAL_IMAGE_QUALITY): Promise<string> => {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Falha ao ler imagem.'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  if (!file.type.startsWith('image/')) return rawDataUrl;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao processar imagem.'));
    img.src = rawDataUrl;
  });

  const longestSide = Math.max(image.width, image.height);
  const scale = longestSide > maxDimension ? maxDimension / longestSide : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) return rawDataUrl;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
};

type PlantProfile = {
  popular: string;
  aliases: string[];
  scientific: string;
  category: string;
  subgroup: string;
  preferredLight: string;
  sunPeriod: string;
  watering: string;
  substrate: string;
  drainage: string;
  filterMaterial: string;
  potSize: string;
  notes: string;
};

const PLANT_PROFILES: PlantProfile[] = [
  { popular: 'Babosa', aliases: ['aloe vera', 'babosa'], scientific: 'Aloe vera', category: 'Suculenta', subgroup: 'Medicinal', preferredLight: 'Sol Pleno', sunPeriod: 'Pleno', watering: 'Quinzenal', substrate: 'Substrato para suculentas', drainage: 'Argila expandida', filterMaterial: 'Sem manta', potSize: 'Médio', notes: 'Prefere substrato drenante e regas espaçadas.' },
  { popular: 'Jiboia', aliases: ['jiboia', 'pothos', 'epipremnum'], scientific: 'Epipremnum aureum', category: 'Folhagem tropical', subgroup: 'Trepadeira', preferredLight: 'Luz Indireta', sunPeriod: 'Parcial', watering: 'Semanal', substrate: 'Substrato para folhagens', drainage: 'Argila expandida', filterMaterial: 'Manta bidim', potSize: 'Médio', notes: 'Vai melhor em meia-sombra e ambiente protegido.' },
  { popular: 'Espada-de-São-Jorge', aliases: ['espada de são jorge', 'espada de sao jorge', 'língua de sogra', 'lingua de sogra', 'sansevieria'], scientific: 'Dracaena trifasciata', category: 'Folhagem resistente', subgroup: 'Rústica', preferredLight: 'Meia Sombra', sunPeriod: 'Parcial', watering: 'Quinzenal', substrate: 'Substrato para suculentas', drainage: 'Argila expandida', filterMaterial: 'Sem manta', potSize: 'Médio', notes: 'Tolera variações, mas não gosta de excesso de água.' },
  { popular: 'Zamioculca', aliases: ['zamioculca', 'zz plant', 'zamioculcas'], scientific: 'Zamioculcas zamiifolia', category: 'Folhagem de interior', subgroup: 'Rústica', preferredLight: 'Luz Indireta', sunPeriod: 'Parcial', watering: 'Quinzenal', substrate: 'Substrato para folhagens', drainage: 'Argila expandida', filterMaterial: 'Manta bidim', potSize: 'Médio', notes: 'Boa para interiores luminosos, evitando encharcamento.' },
  { popular: 'Filodendro Brasil', aliases: ['filodendro brasil', 'philodendron brasil', 'filodendro-brasil'], scientific: 'Philodendron hederaceum Brasil', category: 'Folhagem tropical', subgroup: 'Pendente', preferredLight: 'Luz Indireta', sunPeriod: 'Parcial', watering: 'Semanal', substrate: 'Substrato para folhagens', drainage: 'Argila expandida', filterMaterial: 'Manta bidim', potSize: 'Médio', notes: 'Prefere calor moderado e boa drenagem.' },
  { popular: 'Pilea', aliases: ['pilea', 'pilea peperomioides'], scientific: 'Pilea peperomioides', category: 'Folhagem de interior', subgroup: 'Ornamental', preferredLight: 'Luz Indireta', sunPeriod: 'Parcial', watering: 'Semanal', substrate: 'Substrato para folhagens', drainage: 'Argila expandida', filterMaterial: 'Manta bidim', potSize: 'Pequeno', notes: 'Prefere luminosidade difusa e vaso não muito grande.' },
  { popular: 'Cacto', aliases: ['cacto', 'cactus'], scientific: 'Cactaceae', category: 'Cacto', subgroup: 'Desértica', preferredLight: 'Sol Pleno', sunPeriod: 'Pleno', watering: 'Mensal', substrate: 'Substrato para suculentas', drainage: 'Argila expandida', filterMaterial: 'Sem manta', potSize: 'Pequeno', notes: 'Quanto mais luz e drenagem, melhor.' },
  { popular: 'Orquídea', aliases: ['orquidea', 'orquídea', 'orchid'], scientific: 'Orchidaceae', category: 'Florífera', subgroup: 'Epífita', preferredLight: 'Meia Sombra', sunPeriod: 'Parcial', watering: 'Semanal', substrate: 'Casca de pinus + perlita', drainage: 'Sem drenagem extra', filterMaterial: 'Sem manta', potSize: 'Médio', notes: 'Gosta de ventilação e substrato bem aerado.' },
];

const findPlantProfileByName = (name?: string | null) => {
  const clean = (name || '').trim().toLowerCase();
  if (!clean) return null;
  return PLANT_PROFILES.find(profile => [profile.popular, ...profile.aliases].some(alias => clean === alias.toLowerCase() || clean.includes(alias.toLowerCase()) || alias.toLowerCase().includes(clean))) || null;
};

const buildPlantAutofillPatch = (profile: PlantProfile, current: Partial<Plant>) => {
  const patch: Partial<Plant> = {};
  if (isUnknownChoice(current.species)) patch.species = profile.scientific;
  if (!current.wateringFrequency || current.wateringFrequency === 'Semanal') patch.wateringFrequency = profile.watering;
  if (isUnknownChoice(current.substrate)) patch.substrate = profile.substrate;
  if (isUnknownChoice(current.drainage)) patch.drainage = profile.drainage;
  if (isUnknownChoice(current.filterMaterial)) patch.filterMaterial = profile.filterMaterial;
  if (isUnknownChoice(current.potSize)) patch.potSize = profile.potSize;
  const noteSeed = `Categoria sugerida: ${profile.category} • ${profile.subgroup}. Luz ideal: ${profile.preferredLight}. ${profile.notes}`;
  const currentNotes = normalizeChoice(current.notes);
  if (currentNotes === UNKNOWN_OPTION || !currentNotes.includes('Categoria sugerida:')) patch.notes = currentNotes === UNKNOWN_OPTION ? noteSeed : `${current.notes}
${noteSeed}`;
  return patch;
};

type StockProfile = { matcher: RegExp; category: string; usageTags: string[]; unit: string; notes: string; };
const STOCK_NAME_PROFILES: StockProfile[] = [
  { matcher: /(terra|substrato|humus|húmus|perlita|turfa|pinus)/i, category: 'Substratos & Solos', usageTags: ['Substrato'], unit: 'kg', notes: 'Insumo voltado ao preparo de substratos e replantios.' },
  { matcher: /(argila|brita|areia grossa|carvão|carvao)/i, category: 'Substratos & Solos', usageTags: ['Drenagem'], unit: 'kg', notes: 'Material útil para drenagem e controle de umidade.' },
  { matcher: /(manta|bidim|tela|filtro)/i, category: 'Outros', usageTags: ['Filtragem'], unit: 'un', notes: 'Material de separação de camadas no vaso.' },
  { matcher: /(vaso|cachepot|jardineira|recipiente|copo)/i, category: 'Vasos & Recipientes', usageTags: ['Vaso'], unit: 'un', notes: 'Recipiente útil para cultivo ou propagação.' },
  { matcher: /(fertiliz|adubo|bokashi|npk)/i, category: 'Fertilizantes & Adubos', usageTags: ['Adubação'], unit: 'kg', notes: 'Item de nutrição para manutenção do jardim.' },
  { matcher: /(tesoura|pá|pa|rastelo|luva|pulverizador)/i, category: 'Ferramentas', usageTags: ['Ferramenta'], unit: 'un', notes: 'Ferramenta de apoio ao manejo.' },
  { matcher: /(semente|muda|estaca)/i, category: 'Sementes & Mudas', usageTags: ['Sementes & Mudas', 'Germinação'], unit: 'un', notes: 'Material voltado a propagação e germinação.' },
];

const inferStockProfileByName = (name?: string | null) => {
  const clean = (name || '').trim();
  if (!clean) return null;
  return STOCK_NAME_PROFILES.find(profile => profile.matcher.test(clean)) || null;
};

const buildStockAutofillPatch = (name: string, current: Partial<StockItem>) => {
  const profile = inferStockProfileByName(name);
  if (!profile) return {} as Partial<StockItem>;
  const currentTags = normalizeStockUsageTags(current.usageTags);
  const patch: Partial<StockItem> = {};
  if (!current.category || current.category === 'Outros') patch.category = profile.category;
  if (!current.unit || current.unit === '-') patch.unit = profile.unit;
  if (!currentTags.length) patch.usageTags = profile.usageTags;
  const currentNotes = (current.notes || '').trim();
  if (!currentNotes) patch.notes = profile.notes;
  return patch;
};
const STOCK_USAGE_TAGS = ['Substrato', 'Drenagem', 'Filtragem', 'Vaso', 'Ferramenta', 'Adubação', 'Germinação', 'Sementes & Mudas', 'Defensivo', 'Irrigação', 'Suporte', 'Outro'];

const makeId = () => Math.random().toString(36).slice(2, 9);

const createPhotoEntry = (image: string, note = 'Registro fotográfico', source = 'Manual', date = new Date().toISOString()): PlantPhotoEntry => ({
  id: makeId(),
  date,
  image,
  note,
  source,
});

const normalizePhotoHistory = (photoHistory: unknown, image?: string, createdAt?: string) => {
  const items = Array.isArray(photoHistory) ? photoHistory.filter(Boolean) : [];
  const normalized = items
    .map((item: any) => ({
      id: item?.id || makeId(),
      date: item?.date || createdAt || new Date().toISOString(),
      image: item?.image || '',
      note: item?.note || '',
      source: item?.source || '',
    }))
    .filter((item: any) => !!item.image) as PlantPhotoEntry[];

  if (!normalized.length && image) {
    return [createPhotoEntry(image, 'Registro inicial', 'Cadastro', createdAt || new Date().toISOString())];
  }

  if (image && !normalized.some((item: PlantPhotoEntry) => item.image === image)) {
    normalized.unshift(createPhotoEntry(image, 'Foto principal atual', 'Cadastro', createdAt || new Date().toISOString()));
  }

  return normalized;
};

const normalizePlantRecord = (plant: Partial<Plant>): Plant => {
  const createdAt = plant.createdAt || plant.lastWatered || plant.lastRepotted || new Date().toISOString();
  const photoHistory = normalizePhotoHistory((plant as any).photoHistory, plant.image, createdAt);
  return {
    id: plant.id || makeId(),
    name: plant.name || 'Planta sem nome',
    species: normalizeChoice(plant.species),
    locationId: plant.locationId || '1',
    status: (plant.status as Plant['status']) || 'Saudável',
    wateringFrequency: plant.wateringFrequency || 'Semanal',
    lastWatered: plant.lastWatered || '',
    lastRepotted: plant.lastRepotted || '',
    notes: plant.notes || '',
    image: plant.image || photoHistory[0]?.image,
    potSize: normalizeChoice(plant.potSize),
    substrateMix: normalizeChoice(plant.substrateMix),
    drainageLayer: normalizeChoice(plant.drainageLayer),
    substrate: normalizeChoice(plant.substrate),
    drainage: normalizeChoice(plant.drainage),
    filterMaterial: normalizeChoice(plant.filterMaterial),
    isFavorite: !!plant.isFavorite,
    createdAt,
    photoHistory,
    symptomNotes: plant.symptomNotes || '',
    probableDiagnosis: plant.probableDiagnosis || '',
    possibleTreatment: plant.possibleTreatment || '',
    diagnosisUpdatedAt: plant.diagnosisUpdatedAt || '',
  };
};

const normalizeStockRecord = (item: Partial<StockItem>): StockItem => ({
  id: item.id || makeId(),
  name: item.name || 'Item sem nome',
  quantity: Number(item.quantity || 0),
  unit: normalizeChoice(item.unit || 'un'),
  minQuantity: Number(item.minQuantity || 0),
  category: item.category || 'Outros',
  usageTags: inferStockUsageTags(item as StockItem),
  notes: item.notes || '',
  image: item.image || '',
  locationId: item.locationId || '',
});

const normalizeGerminationRecord = (item: Partial<Germination>): Germination => ({
  id: item.id || makeId(),
  name: item.name || 'Semente sem nome',
  species: item.species || '',
  startDate: item.startDate || new Date().toISOString(),
  expectedDays: Number(item.expectedDays || 7),
  status: (item.status as Germination['status']) || 'Em andamento',
  notes: item.notes || '',
  lastWatered: item.lastWatered || '',
  hydratedWithWarmWater: !!item.hydratedWithWarmWater,
  image: item.image || '',
  plantingInstructions: item.plantingInstructions || '',
  stockSuggestions: item.stockSuggestions || '',
  germinationTechniques: item.germinationTechniques || '',
  hydrationInstructions: item.hydrationInstructions || '',
  recommendedLight: item.recommendedLight || '',
  wateringTips: item.wateringTips || '',
  transferredPlantId: item.transferredPlantId || '',
  transferredAt: item.transferredAt || '',
  locationId: item.locationId || '',
});

const attachPhotoToPlant = (plant: Plant, image?: string | null, note = 'Atualização visual', source = 'Manual'): Plant => {
  if (!image) return normalizePlantRecord(plant);
  const history = normalizePhotoHistory(plant.photoHistory, plant.image, plant.createdAt);
  const alreadyExists = history.some(item => item.image === image);
  const nextHistory = alreadyExists ? history : [createPhotoEntry(image, note, source), ...history];
  return normalizePlantRecord({ ...plant, image, photoHistory: nextHistory });
};

const getPlantLifeLabel = (createdAt?: string) => {
  if (!createdAt) return 'Sem data';
  const started = new Date(createdAt).getTime();
  if (Number.isNaN(started)) return 'Sem data';
  const diff = Math.max(0, Date.now() - started);
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hoje';
  if (days < 30) return `${days} dia${days > 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mês${months > 1 ? 'es' : ''}`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return `${years} ano${years > 1 ? 's' : ''}${remMonths ? ` e ${remMonths} mês${remMonths > 1 ? 'es' : ''}` : ''}`;
};

const imageFieldClassName = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl';

const isGeminiQuotaError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  return /RESOURCE_EXHAUSTED|quota|429|API_KEY_INVALID|missing-gemini-key|not valid/i.test(message);
};

async function getImageBrightness(base64Image: string): Promise<number> {
  if (typeof document === 'undefined') return 160;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(160);
      ctx.drawImage(img, 0, 0, 64, 64);
      const data = ctx.getImageData(0, 0, 64, 64).data;
      let total = 0;
      for (let i = 0; i < data.length; i += 4) {
        total += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      }
      resolve(total / (data.length / 4));
    };
    img.onerror = () => resolve(160);
    img.src = base64Image;
  });
}

async function analyzeLightLocally(base64Image: string): Promise<LightAnalysisResult> {
  const brightness = await getImageBrightness(base64Image);
  let level = 'Meia Sombra';
  let sunPeriod = 'Parcial';
  if (brightness >= 190) {
    level = 'Sol Pleno';
    sunPeriod = 'Dia inteiro';
  } else if (brightness >= 160) {
    level = 'Sol Parcial';
    sunPeriod = 'Parcial';
  } else if (brightness >= 125) {
    level = 'Meia Sombra';
    sunPeriod = 'Manhã';
  } else if (brightness >= 95) {
    level = 'Luz Indireta';
    sunPeriod = 'Não recebe sol direto';
  } else {
    level = 'Sombra';
    sunPeriod = 'Não recebe sol direto';
  }
  return {
    level,
    sunPeriod,
    explanation: `Leitura local básica baseada no brilho médio da foto (${Math.round(brightness)}).`,
    tip: level === 'Sol Pleno' ? 'Bom para espécies de sol forte e vasos que drenem bem.' : level === 'Luz Indireta' || level === 'Sombra' ? 'Prefira folhagens e monitore excesso de umidade.' : 'Ambiente versátil para boa parte das ornamentais.',
    middayTip: MIDDAY_LIGHT_GUIDE,
  };
}

function identifyPlantLocally(light: LightAnalysisResult, stock: StockItem[]) {
  const bundle = buildStockRecommendationBundle(stock, {
    potSize: light.level === 'Sol Pleno' ? 'Médio' : 'Pequeno',
    substrate: light.level === 'Sol Pleno' ? 'Terra + areia' : 'Terra vegetal',
    drainage: light.level === 'Sol Pleno' ? 'Argila expandida' : 'Sem drenagem extra',
    filterMaterial: 'Sem manta',
  });
  return {
    name: light.level === 'Sol Pleno' ? 'Planta de sol fotografada' : 'Planta ornamental fotografada',
    species: UNKNOWN_OPTION,
    status: 'Saudável',
    wateringFrequency: light.level === 'Sol Pleno' ? 'Semanal' : 'Quinzenal',
    notes: `Identificação local básica. Revise manualmente a espécie. Luz estimada: ${light.level}.`,
    potSize: bundle.patch.potSize || 'Médio',
    substrate: bundle.patch.substrate || 'Terra vegetal',
    substrateMix: UNKNOWN_OPTION,
    drainage: bundle.patch.drainage || 'Argila expandida',
    drainageLayer: UNKNOWN_OPTION,
    filterMaterial: bundle.patch.filterMaterial || 'Sem manta',
    stockSuggestions: bundle.summary,
  };
}

function identifyStockLocally() {
  return {
    name: 'Item fotografado',
    category: 'Outros',
    usageTags: ['Outro'],
    unit: 'un',
    notes: 'Leitura local básica da imagem. Se você digitar o nome do item, a ficha tenta se autopreencher com categoria, unidade e usos no app.',
    confidence: 'Baixa'
  };
}

function identifySeedLocally(stock: StockItem[]) {
  const substrateItem = getAvailableStockByUsageTag(stock, 'Substrato')[0] || stock[0];
  const drainageItem = getAvailableStockByUsageTag(stock, 'Germinação')[0] || getAvailableStockByUsageTag(stock, 'Substrato')[0];
  return {
    name: 'Semente / embalagem fotografada',
    species: UNKNOWN_OPTION,
    plantingInstructions: 'Use recipiente limpo, substrato leve e semente a pouca profundidade. Mantenha umidade constante sem encharcar.',
    stockSuggestions: substrateItem ? `Comece usando ${substrateItem.name}${drainageItem && drainageItem.id !== substrateItem.id ? ` e complemente com ${drainageItem.name}` : ''}.` : 'Use um substrato leve e limpo para germinação.',
    estimatedGerminationDays: 7,
    warmWaterHydration: false,
    hydrationInstructions: 'Nem toda semente precisa de hidratação prévia. Faça somente se souber que a espécie se beneficia disso.',
    germinationTechniques: 'Classificação local básica: mantenha temperatura estável, substrato leve e boa ventilação.',
    recommendedLight: 'Luz indireta brilhante até a emergência das mudas.',
    wateringTips: 'Borrife água para manter o substrato levemente úmido.'
  }
}

function diagnosePlantLocally() {
  return {
    problem: 'Análise local básica',
    cause: 'Não foi possível confirmar praga ou doença sem análise avançada. Revise rega, ventilação e sinais visuais.',
    treatment: 'Remova partes muito danificadas, isole a planta se houver suspeita de praga, ajuste a rega e observe por 3 a 5 dias antes de intervir mais forte.',
    severity: 'Baixa'
  };
}

function diagnoseSymptomsLocally(symptoms: string, plant?: Partial<Plant>) {
  const raw = (symptoms || '').trim();
  const text = raw.toLowerCase();
  if (!raw) {
    return {
      probableDiagnosis: '',
      possibleTreatment: '',
    };
  }

  let probableDiagnosis = 'Estresse geral de manejo';
  let possibleTreatment = 'Revise rega, ventilação, luminosidade e drenagem. Observe a planta por 3 a 5 dias antes de mudanças fortes.';

  if (/amarel|folha amarela|clorose/.test(text)) {
    probableDiagnosis = 'Possível excesso de rega ou drenagem insuficiente';
    possibleTreatment = 'Reduza a frequência de rega, confira se o vaso drena bem e revise a camada de drenagem. Remova folhas já totalmente amarelas.';
  } else if (/seca|marrom|pontas secas|queimada|queimad/.test(text)) {
    probableDiagnosis = 'Possível baixa umidade, sol excessivo ou falta de água';
    possibleTreatment = 'Afaste do sol forte se necessário, aumente a umidade do ambiente e regularize a rega sem encharcar o substrato.';
  } else if (/mole|caule mole|apodrec|podre/.test(text)) {
    probableDiagnosis = 'Possível apodrecimento por excesso de água';
    possibleTreatment = 'Suspenda regas por alguns dias, retire partes moles e avalie replantio com substrato mais drenante.';
  } else if (/mancha|fung|bolor|mofo/.test(text)) {
    probableDiagnosis = 'Possível fungo ou mancha foliar';
    possibleTreatment = 'Isole a planta se necessário, melhore a ventilação, evite molhar folhas à noite e retire partes muito atacadas.';
  } else if (/praga|pulg|cochon|ácar|acaro|mosqu|tripes/.test(text)) {
    probableDiagnosis = 'Possível ataque de pragas';
    possibleTreatment = 'Isole a planta, limpe folhas com pano úmido e considere defensivo leve como óleo de neem, se você já usar esse manejo.';
  } else if (/murch|caid|sem vigor/.test(text)) {
    probableDiagnosis = 'Possível estresse hídrico ou de adaptação';
    possibleTreatment = 'Revise rega recente, vento, calor e mudanças de ambiente. Mantenha a planta em local estável por alguns dias.';
  }

  if (plant?.status === 'Recuperação') {
    possibleTreatment += ' Como a planta está em recuperação, evite trocas bruscas de local ou adubação forte.';
  }

  return {
    probableDiagnosis,
    possibleTreatment,
  };
}

const normalizeChoice = (value?: string | null) => {
  const clean = (value || '').trim();
  return clean ? clean : UNKNOWN_OPTION;
};

const isUnknownChoice = (value?: string | null) => normalizeChoice(value) === UNKNOWN_OPTION;

const normalizeStockUsageTags = (tags?: unknown) => {
  const values = Array.isArray(tags)
    ? tags
    : typeof tags === 'string'
      ? tags.split(/[,;|]/)
      : [];

  const normalized = values
    .map(value => normalizeChoice(String(value)))
    .filter(value => value !== UNKNOWN_OPTION);

  return Array.from(new Set(normalized)).filter(tag => STOCK_USAGE_TAGS.includes(tag));
};

const inferStockUsageTags = (item?: Partial<StockItem> | null) => {
  if (!item) return [] as string[];
  const direct = normalizeStockUsageTags(item.usageTags);
  const combined = [item.name, item.category, item.notes].filter(Boolean).join(' ').toLowerCase();
  const inferred = new Set<string>(direct);

  if (/substrato|terra|humus|húmus|perlita|pinus|fibra|turfa/.test(combined)) inferred.add('Substrato');
  if (/argila|brita|areia grossa|carvão|carvao|drenag/.test(combined)) inferred.add('Drenagem');
  if (/manta|bidim|tela|filtro/.test(combined)) inferred.add('Filtragem');
  if (/vaso|cachepot|jardineira|recipiente|copo/.test(combined)) inferred.add('Vaso');
  if (/pá|pa|tesoura|regador|borrifador|ferramenta|pulverizador/.test(combined)) inferred.add('Ferramenta');
  if (/fertiliz|adubo|bokashi|npk/.test(combined)) inferred.add('Adubação');
  if (/germina|berçário|bercario|semead/.test(combined)) inferred.add('Germinação');
  if (/semente|muda|estaca/.test(combined)) inferred.add('Sementes & Mudas');
  if (/praga|fung|óleo|oleo|neem|defensivo|inseticida/.test(combined)) inferred.add('Defensivo');
  if (/rega|água|agua|irrig|mangueira|borrifador|regador/.test(combined)) inferred.add('Irrigação');
  if (/tutor|estaca|suporte|amarra|arame/.test(combined)) inferred.add('Suporte');
  if (/ferramentas/.test((item.category || '').toLowerCase())) inferred.add('Ferramenta');
  if (/vasos/.test((item.category || '').toLowerCase())) inferred.add('Vaso');
  if (/fertilizantes/.test((item.category || '').toLowerCase())) inferred.add('Adubação');
  if (/sementes/.test((item.category || '').toLowerCase())) {
    inferred.add('Sementes & Mudas');
    inferred.add('Germinação');
  }
  if (/defensivos/.test((item.category || '').toLowerCase())) inferred.add('Defensivo');

  return Array.from(inferred).filter(tag => STOCK_USAGE_TAGS.includes(tag));
};

const itemHasStockUsageTag = (item: StockItem, tag: string) => inferStockUsageTags(item).includes(tag);

const buildStockContext = (stock: StockItem[]) => {
  if (!stock.length) return 'Nenhum item cadastrado em estoque.';
  return stock
    .map(item => {
      const usageTags = inferStockUsageTags(item);
      const usagePart = usageTags.length ? `; usos: ${usageTags.join(', ')}` : '';
      return `${item.name} (${item.quantity} ${item.unit}, categoria: ${item.category}${usagePart})`;
    })
    .join(', ');
};

const LIGHT_LEVEL_OPTIONS = ['Sol Pleno', 'Sol Parcial', 'Meia Sombra', 'Sombra', 'Luz Indireta'];
const SUN_PERIOD_OPTIONS = ['Dia inteiro', 'Manhã', 'Tarde', 'Parcial', 'Não recebe sol direto'];
const MIDDAY_LIGHT_GUIDE = 'Faça a medição preferencialmente ao meio-dia, sem flash, para captar o pico de luminosidade com mais precisão.';

const normalizeLightLevel = (value?: string | null) => {
  const clean = normalizeChoice(value);
  if (LIGHT_LEVEL_OPTIONS.includes(clean)) return clean;
  if (/pleno/i.test(clean)) return 'Sol Pleno';
  if (/parcial/i.test(clean)) return 'Sol Parcial';
  if (/meia/i.test(clean)) return 'Meia Sombra';
  if (/indireta/i.test(clean)) return 'Luz Indireta';
  if (/sombra/i.test(clean)) return 'Sombra';
  return 'Meia Sombra';
};

const normalizeSunPeriod = (value?: string | null) => {
  const clean = normalizeChoice(value);
  if (SUN_PERIOD_OPTIONS.includes(clean)) return clean;
  if (/dia/i.test(clean)) return 'Dia inteiro';
  if (/manh/i.test(clean)) return 'Manhã';
  if (/tarde/i.test(clean)) return 'Tarde';
  if (/direto/i.test(clean) || /parcial/i.test(clean)) return 'Parcial';
  if (/n[aã]o/i.test(clean) || /sombra/i.test(clean) || /indireta/i.test(clean)) return 'Não recebe sol direto';
  return 'Parcial';
};


const lightScore = (desired: string[], actual?: string | null) => {
  const level = normalizeLightLevel(actual);
  if (desired.includes(level)) return 28;
  const broadMap: Record<string, string[]> = {
    'Sol Pleno': ['Sol Parcial'],
    'Sol Parcial': ['Sol Pleno', 'Meia Sombra'],
    'Meia Sombra': ['Sol Parcial', 'Luz Indireta'],
    'Luz Indireta': ['Meia Sombra', 'Sombra'],
    'Sombra': ['Luz Indireta'],
  };
  return desired.some(target => (broadMap[target] || []).includes(level)) ? 16 : 4;
};

const describeRank = (score: number): RankedLocationMatch['label'] => score >= 78 ? 'Ideal' : score >= 58 ? 'Boa opção' : 'Atenção';

const buildPlantProfile = (plant: Partial<Plant>) => {
  const combined = `${plant.name || ''} ${plant.species || ''} ${plant.notes || ''}`.toLowerCase();
  let preferredLights = ['Meia Sombra', 'Luz Indireta'];
  if (/aloe|babosa|cacto|suculent|crassula|echeveria|agave|onze-horas|rosa do deserto/.test(combined)) preferredLights = ['Sol Pleno', 'Sol Parcial'];
  if (/jiboia|philodend|filodendro|samambaia|calathea|maranta|lírio|lirio|spathiphyllum|zamioculca|anturio|costela/.test(combined)) preferredLights = ['Meia Sombra', 'Luz Indireta'];
  if (/manjeric|alecrim|lavanda|tomilho|salsa|hortelã|hortela|basil/.test(combined)) preferredLights = ['Sol Pleno', 'Sol Parcial'];
  const fragile = ['Recuperação', 'Muda'].includes((plant.status || '') as string) || /muda|estaca|recupera/.test(combined);
  const water = plant.wateringFrequency || '';
  const preferCovered = fragile || /Diária|Semanal/.test(water);
  const avoidRain = fragile || /indireta|sombra/.test(preferredLights.join(' '));
  return { preferredLights, preferCovered, avoidRain, preferMorningOnly: fragile };
};

const getPlantEnvironmentRecommendation = (plant: Partial<Plant>, locations: Location[]): EnvironmentRecommendation => {
  const profile = buildPlantProfile(plant);
  const ranked = locations.map(location => {
    let score = 42 + lightScore(profile.preferredLights, location.light);
    const reasons = [`luz ${normalizeLightLevel(location.light)}`];
    if (profile.preferCovered) {
      if (location.covered) { score += 12; reasons.push('local coberto'); } else { score -= 12; reasons.push('muito exposto'); }
    }
    if (profile.avoidRain) {
      if (location.receivesRain) { score -= 12; reasons.push('recebe chuva'); } else { score += 8; reasons.push('protegido da chuva'); }
    }
    if (profile.preferMorningOnly) {
      const sun = normalizeSunPeriod(location.sunPeriod);
      if (sun === 'Manhã' || sun === 'Não recebe sol direto' || sun === 'Parcial') score += 8;
      if (sun === 'Dia inteiro') { score -= 10; reasons.push('sol longo para adaptação'); }
    }
    if ((plant.wateringFrequency || '') === 'Mensal' || (plant.wateringFrequency || '') === 'Quinzenal') {
      if (normalizeLightLevel(location.light) === 'Sol Pleno' || normalizeLightLevel(location.light) === 'Sol Parcial') score += 4;
    }
    score = Math.max(0, Math.min(100, score));
    return { id: location.id, name: location.name, score, label: describeRank(score), reason: reasons.join(' • ') };
  }).sort((a,b)=>b.score-a.score);
  return { best: ranked[0], current: ranked.find(item => item.id === plant.locationId), ranked };
};

const getSeedEnvironmentRecommendation = (germination: Partial<Germination>, locations: Location[]): EnvironmentRecommendation => {
  const combined = `${germination.name || ''} ${germination.species || ''} ${germination.notes || ''} ${germination.recommendedLight || ''}`.toLowerCase();
  const prefersBrightIndirect = !/sol pleno|dia inteiro/.test(combined);
  const ranked = locations.map(location => {
    let score = 38;
    const reasons: string[] = [];
    const light = normalizeLightLevel(location.light);
    if (prefersBrightIndirect) {
      if (['Luz Indireta', 'Meia Sombra', 'Sol Parcial'].includes(light)) { score += 28; reasons.push(`luz ${light.toLowerCase()}`); }
      else { score -= 12; reasons.push(`luz ${light.toLowerCase()}`); }
    }
    if (location.covered) { score += 14; reasons.push('local coberto'); } else { score -= 16; reasons.push('exposição alta'); }
    if (location.receivesRain) { score -= 14; reasons.push('chuva pode atrapalhar a germinação'); } else { score += 10; reasons.push('proteção contra chuva'); }
    const sun = normalizeSunPeriod(location.sunPeriod);
    if (sun === 'Dia inteiro') score -= 8;
    score = Math.max(0, Math.min(100, score));
    return { id: location.id, name: location.name, score, label: describeRank(score), reason: reasons.join(' • ') };
  }).sort((a,b)=>b.score-a.score);
  return { best: ranked[0], current: ranked.find(item => item.id === germination.locationId), ranked };
};

const getStockEnvironmentRecommendation = (item: Partial<StockItem>, locations: Location[]): EnvironmentRecommendation => {
  const combined = `${item.name || ''} ${item.category || ''} ${item.notes || ''} ${(item.usageTags || []).join(' ')}`.toLowerCase();
  const keepDry = /substrato|solo|adubo|fertiliz|semente|muda|ferramenta|papel|vaso|germina/.test(combined);
  const avoidSun = /semente|muda|fertiliz|substrato|defensivo/.test(combined);
  const ranked = locations.map(location => {
    let score = 40;
    const reasons: string[] = [];
    const light = normalizeLightLevel(location.light);
    if (keepDry) {
      if (location.covered) { score += 16; reasons.push('local coberto'); } else { score -= 16; reasons.push('exposto ao tempo'); }
      if (location.receivesRain) { score -= 16; reasons.push('recebe chuva'); } else { score += 10; reasons.push('melhor para armazenamento'); }
    }
    if (avoidSun) {
      if (['Luz Indireta', 'Meia Sombra', 'Sombra'].includes(light)) { score += 14; reasons.push(`luz ${light.toLowerCase()}`); }
      else { score -= 10; reasons.push('sol pode aquecer a embalagem'); }
    } else if (/vaso|ferramenta|suporte/.test(combined) && location.covered) {
      score += 6;
    }
    score = Math.max(0, Math.min(100, score));
    return { id: location.id, name: location.name, score, label: describeRank(score), reason: reasons.join(' • ') };
  }).sort((a,b)=>b.score-a.score);
  return { best: ranked[0], current: ranked.find(item2 => item2.id === item.locationId), ranked };
};

const DAILY_INSIGHTS_CACHE_PREFIX = 'atena_garden_daily_insights_v11';
const WEATHER_CACHE_PREFIX = 'atena_garden_weather_cache_v11';
const getDayKey = () => new Date().toISOString().slice(0, 10);
const getWeekKey = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - firstDay.getTime()) / 86400000) + 1;
  const week = Math.ceil((dayOfYear + firstDay.getDay()) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
};
const getInsightsCacheKey = (dayKey = getDayKey()) => `${DAILY_INSIGHTS_CACHE_PREFIX}:${dayKey}`;
const getWeatherCacheKey = (settings: AppSettings) => `${WEATHER_CACHE_PREFIX}:${settings.weatherMode}:${(settings.gardenAddress || 'auto').trim().toLowerCase()}`;
const WATERING_DAY_MAP: Record<string, number> = { 'Diária': 1, 'Semanal': 7, 'Quinzenal': 15, 'Mensal': 30 };
const getPlantAgeDays = (createdAt?: string) => {
  if (!createdAt) return 0;
  const started = new Date(createdAt).getTime();
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.floor((Date.now() - started) / 86400000));
};
const isPlantLikelyDue = (plant: Plant) => {
  const interval = WATERING_DAY_MAP[plant.wateringFrequency] || 7;
  if (!plant.lastWatered) return true;
  const last = new Date(plant.lastWatered).getTime();
  if (Number.isNaN(last)) return true;
  return ((Date.now() - last) / 86400000) >= interval;
};
const compactList = (values: string[], fallback = 'nenhum destaque') => {
  const cleaned = values.map(v => (v || '').trim()).filter(Boolean);
  return cleaned.length ? cleaned.join(', ') : fallback;
};
const buildMiniGardenContext = (plants: Plant[], locations: Location[], weather: WeatherData | null, forecast: ForecastData | null, germinations: Germination[], tasks: Task[], stock: StockItem[], history: HistoryItem[]) => {
  const duePlants = plants.filter(isPlantLikelyDue);
  const stressedPlants = plants.filter(p => p.status === 'Problema' || p.status === 'Recuperação');
  const youngPlants = plants.filter(p => getPlantAgeDays(p.createdAt) <= 30);
  const oldPlants = plants.filter(p => getPlantAgeDays(p.createdAt) >= 180);
  const runningGerminations = germinations.filter(g => g.status === 'Em andamento');
  const uncoveredLocations = locations.filter(location => location.receivesRain || !location.covered).map(location => location.name);
  const recentHistory = history.slice(0, 8).map(item => `${item.type}:${item.title}`).join('; ');
  const stockSummary = stock.slice(0, 8).map(item => `${item.name}/${compactList(inferStockUsageTags(item), 'uso geral')}/${item.quantity}${item.unit}`).join('; ');
  return {
    weatherLine: weather ? `${weather.temp}°C, ${weather.condition}, umidade ${weather.humidity}%, chuva ${weather.rainProb}%` : 'clima indisponível',
    forecastLine: forecast ? `amanhã ${forecast.tempMax}/${forecast.tempMin}°C, ${forecast.condition}, chuva ${forecast.rainProb}%` : 'sem previsão',
    plantsLine: compactList(plants.slice(0, 8).map(plant => {
      const locationName = locations.find(location => location.id === plant.locationId)?.name || 'local indefinido';
      return `${plant.name} (${plant.status}, ${plant.wateringFrequency}, ${locationName}, ${getPlantAgeDays(plant.createdAt)}d)`;
    })),
    dueCount: duePlants.length,
    stressedCount: stressedPlants.length,
    youngCount: youngPlants.length,
    oldCount: oldPlants.length,
    dueNames: compactList(duePlants.slice(0, 4).map(plant => plant.name)),
    stressedNames: compactList(stressedPlants.slice(0, 4).map(plant => plant.name)),
    youngNames: compactList(youngPlants.slice(0, 4).map(plant => plant.name)),
    oldNames: compactList(oldPlants.slice(0, 4).map(plant => plant.name)),
    germinationLine: runningGerminations.length ? compactList(runningGerminations.slice(0, 4).map(g => `${g.name} (${Math.max(0, g.expectedDays - Math.floor((Date.now() - new Date(g.startDate).getTime()) / 86400000))}d restantes)`)) : 'nenhuma germinação em andamento',
    taskLine: compactList(tasks.filter(task => !task.completed).slice(0, 5).map(task => task.title)),
    uncoveredLine: compactList(uncoveredLocations.slice(0, 4)),
    stockLine: stockSummary || 'estoque vazio',
    recentHistory: recentHistory || 'sem histórico recente',
  };
};
const generateLocalInsights = (plants: Plant[], locations: Location[], weather: WeatherData | null, forecast: ForecastData | null, germinations: Germination[], tasks: Task[], stock: StockItem[], history: HistoryItem[]): DailyGardenInsights => {
  const dayKey = getDayKey();
  const weekKey = getWeekKey();
  const duePlants = plants.filter(isPlantLikelyDue);
  const stressedPlants = plants.filter(p => p.status === 'Problema' || p.status === 'Recuperação');
  const youngPlants = plants.filter(p => getPlantAgeDays(p.createdAt) <= 30);
  const oldPlants = plants.filter(p => getPlantAgeDays(p.createdAt) >= 180);
  const runningGerminations = germinations.filter(g => g.status === 'Em andamento');
  const readyToTransfer = germinations.filter(g => g.status === 'Sucesso' && !g.transferredPlantId);
  const recentHistory = history.filter(item => Date.now() - new Date(item.date).getTime() <= 7 * 86400000);
  const hotWeather = !!weather && weather.temp >= 32;
  const rainyWeather = !!weather && weather.rainProb >= 70;
  const uncoveredPlants = plants.filter(plant => {
    const location = locations.find(loc => loc.id === plant.locationId);
    return location && (!location.covered || location.receivesRain);
  });
  const substrateChoice = getAvailableStockByUsageTag(stock, 'Substrato')[0]?.name || getAvailableStockByCategory(stock, 'Substratos')[0]?.name || 'substrato leve';
  const drainageChoice = getAvailableStockByUsageTag(stock, 'Drenagem')[0]?.name || 'argila expandida ou equivalente';
  const filterChoice = getAvailableStockByUsageTag(stock, 'Filtragem')[0]?.name || 'manta ou tela filtrante';
  const priorities = [
    duePlants.length ? `Regar ${duePlants.length} planta(s): ${compactList(duePlants.slice(0, 3).map(plant => plant.name))}.` : '',
    stressedPlants.length ? `Revisar ${stressedPlants.length} planta(s) em recuperação/problema: ${compactList(stressedPlants.slice(0, 3).map(plant => plant.name))}.` : '',
    runningGerminations.length ? `Checar ${runningGerminations.length} germinação(ões): ${compactList(runningGerminations.slice(0, 3).map(item => item.name))}.` : '',
    hotWeather ? `Dia quente (${weather?.temp}°C). Priorize sombra parcial e umidade controlada nas áreas sensíveis.` : '',
    rainyWeather && uncoveredPlants.length ? `Há chance alta de chuva para ${uncoveredPlants.length} planta(s) em local descoberto.` : '',
  ].filter(Boolean).slice(0, 3);
  const checklist = [
    duePlants.length ? 'Regar apenas o que estiver realmente com substrato secando, sem encharcar.' : 'Conferir umidade antes de qualquer rega extra.',
    runningGerminations.length ? 'Observar germinação e manter umidade leve e constante.' : 'Revisar vasos novos e mudas recentes.',
    hotWeather ? 'Evitar replantio no pico do calor e proteger folhas mais sensíveis.' : 'Aproveitar o clima para organização leve do jardim.',
    rainyWeather ? 'Verificar ambientes descobertos e drenagem ativa.' : 'Checar se ambientes cobertos continuam bem ventilados.',
    stock.length ? `Separar ${substrateChoice} e ${drainageChoice} para próximos manejos.` : 'Atualizar o estoque básico antes do próximo replantio.',
  ].slice(0, 5);
  const weeklyTypes = recentHistory.reduce((acc, item) => { acc[item.type] = (acc[item.type] || 0) + 1; return acc; }, {} as Record<string, number>);
  return {
    dayKey,
    weekKey,
    source: 'local',
    botanistOfDay: hotWeather
      ? `Calor em alta: foque em umidade equilibrada, sombra parcial e revisão do fim do dia.`
      : duePlants.length
        ? `Seu jardim pede atenção em ${duePlants.length} rega(s) e revisão das plantas mais novas.`
        : `Jardim estável hoje: aproveite para observar evolução, limpar folhas e organizar o estoque.`,
    priorities: priorities.length ? priorities : ['Observar o estado geral do jardim, revisar folhas e manter a rotina leve.'],
    checklist,
    maintenanceAdvice: stressedPlants.length
      ? `Priorize ${compactList(stressedPlants.slice(0, 3).map(plant => plant.name))}. Revise rega, ventilação, drenagem e exposição do ambiente antes de intervir mais forte.`
      : `Mantenha a rotina alinhada ao clima e à idade das plantas. Jovens pedem observação mais frequente; plantas antigas pedem manutenção mais estável.`,
    routineTips: runningGerminations.length
      ? `Hoje vale borrifar mudas e checar germinação antes do meio da tarde. Evite mudanças bruscas de ambiente.`
      : hotWeather
        ? `Evite replantios no horário mais quente. Faça inspeção leve pela manhã e reavalie no fim do dia.`
        : `Bom dia para revisar substrato, vasos e folhas sem pressa.`,
    riskAnalysis: rainyWeather && uncoveredPlants.length
      ? `Risco de excesso de umidade em áreas descobertas. Revise drenagem e afaste vasos mais sensíveis da chuva direta.`
      : hotWeather
        ? `Risco de estresse térmico em locais de sol pleno e em mudas recém-transferidas.`
        : `Risco baixo hoje. Foque em prevenção simples e observação.`,
    germinationGuidance: runningGerminations.length
      ? `Germinações em andamento: ${compactList(runningGerminations.slice(0, 3).map(item => item.name))}. Mantenha luz indireta brilhante, umidade leve e monitoramento diário sem excesso de água.`
      : readyToTransfer.length
        ? `Há germinações prontas para virar planta do jardim. Planeje a transferência com substrato leve e boa drenagem.`
        : `Sem germinação crítica hoje. Aproveite para organizar sementes, etiquetas e recipiente de mudas.`,
    repotAdvice: `Para próximos replantios, prefira combinar ${substrateChoice} com ${drainageChoice} e ${filterChoice}. Faça isso fora do pico de calor e observe plantas em recuperação primeiro.`,
    climateManagement: weather
      ? `Clima de hoje: ${weather.temp}°C, ${weather.condition}, umidade ${weather.humidity}% e chuva ${weather.rainProb}%. Ajuste manejo conforme calor, chuva e exposição de cada ambiente.`
      : 'Sem clima em tempo real. Use a regra local do app para priorizar observação dos ambientes mais expostos.',
    weeklyReview: recentHistory.length
      ? `Na semana, houve ${recentHistory.length} registro(s): ${Object.entries(weeklyTypes).map(([type, count]) => `${count} ${type.toLowerCase()}`).join(', ')}. Observe o que evoluiu e o que ainda precisa de constância.`
      : 'Ainda há pouco histórico nesta semana. Gere novos registros de foto, rega e replantio para melhorar a revisão semanal.',
    newPlantsAdvice: youngPlants.length
      ? `Plantas novas: ${compactList(youngPlants.slice(0, 3).map(plant => plant.name))}. Priorize adaptação, observação diária e rega com cautela nos primeiros 30 dias.`
      : 'Sem muitas plantas recém-cadastradas. Mantenha um protocolo leve para as próximas entradas no jardim.',
    oldPlantsAdvice: oldPlants.length
      ? `Plantas antigas: ${compactList(oldPlants.slice(0, 3).map(plant => plant.name))}. Revise histórico de replantio, vigor e constância da manutenção para evitar queda lenta de desempenho.`
      : 'Seu jardim ainda está em fase jovem ou sem datas antigas suficientes para conselhos de plantas maduras.',
    stockMixAdvice: `Com o estoque atual, a mistura mais útil para muda, germinação ou replantio é começar por ${substrateChoice}, reforçar drenagem com ${drainageChoice} e usar ${filterChoice} quando o recipiente pedir separação de camadas.`,
    report: `Resumo local do jardim: ${plants.length} planta(s), ${duePlants.length} possível(is) rega(s) pendente(s), ${stressedPlants.length} planta(s) sensível(is), ${runningGerminations.length} germinação(ões) ativa(s) e ${stock.length} item(ns) em estoque.`
  };
};
const buildGeminiInsightsPrompt = (context: ReturnType<typeof buildMiniGardenContext>) => `Você é um botânico de bolso. Com base apenas nestes dados curtos do jardim, gere um JSON em pt-BR com textos curtos e práticos.

Contexto:
- clima: ${context.weatherLine}
- previsão: ${context.forecastLine}
- plantas: ${context.plantsLine}
- regas pendentes: ${context.dueCount} (${context.dueNames})
- plantas sensíveis: ${context.stressedCount} (${context.stressedNames})
- plantas novas: ${context.youngCount} (${context.youngNames})
- plantas antigas: ${context.oldCount} (${context.oldNames})
- germinação: ${context.germinationLine}
- tarefas: ${context.taskLine}
- ambientes descobertos: ${context.uncoveredLine}
- estoque: ${context.stockLine}
- histórico recente: ${context.recentHistory}

Responda em JSON com estes campos: botanistOfDay (string), priorities (array com 3 strings), checklist (array com até 5 strings), maintenanceAdvice (string), routineTips (string), riskAnalysis (string), germinationGuidance (string), repotAdvice (string), climateManagement (string), weeklyReview (string), newPlantsAdvice (string), oldPlantsAdvice (string), stockMixAdvice (string), report (string). Limites: textos curtos, sem repetir contexto inteiro, sem mencionar imagem, sem listas longas.`;

async function analyzeLightWithAI(base64Image: string): Promise<LightAnalysisResult> {
  return analyzeLightLocally(base64Image);
}

const getAvailableStockByCategory = (stock: StockItem[], category: string) =>
  stock.filter(item => item.quantity > 0 && item.category.toLowerCase().includes(category.toLowerCase()));

const getAvailableStockByUsageTag = (stock: StockItem[], tag: string) =>
  stock.filter(item => item.quantity > 0 && itemHasStockUsageTag(item, tag));

const findStockMatch = (stock: StockItem[], value?: string | null) => {
  const clean = (value || '').trim().toLowerCase();
  if (!clean || clean === UNKNOWN_OPTION.toLowerCase()) return null;
  return stock.find(item => item.quantity > 0 && (clean.includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(clean)));
};

const mapSubstrateOptionFromStock = (item?: StockItem | null) => {
  if (!item) return UNKNOWN_OPTION;
  const name = item.name.toLowerCase();
  if (/suculent/.test(name)) return 'Substrato para suculentas';
  if (/folhag/.test(name)) return 'Substrato para folhagens';
  if (/pinus|perlita/.test(name)) return 'Casca de pinus + perlita';
  if (/húmus|humus/.test(name)) return 'Terra + húmus';
  if (/areia/.test(name)) return 'Terra + areia';
  if (/terra|substrato/.test(name)) return 'Terra vegetal';
  return UNKNOWN_OPTION;
};

const mapDrainageOptionFromStock = (item?: StockItem | null) => {
  if (!item) return UNKNOWN_OPTION;
  const name = item.name.toLowerCase();
  if (/argila/.test(name)) return 'Argila expandida';
  if (/brita/.test(name)) return 'Brita';
  if (/areia/.test(name)) return 'Areia grossa';
  if (/carvão|carvao/.test(name)) return 'Carvão vegetal';
  return UNKNOWN_OPTION;
};

const mapFilterOptionFromStock = (item?: StockItem | null) => {
  if (!item) return UNKNOWN_OPTION;
  const name = item.name.toLowerCase();
  if (/manta|bidim/.test(name)) return 'Manta bidim';
  if (/tela/.test(name)) return 'Tela plástica';
  if (/filtro/.test(name)) return 'Filtro de café';
  return UNKNOWN_OPTION;
};

const mapPotOptionFromStock = (item?: StockItem | null) => {
  if (!item) return UNKNOWN_OPTION;
  const name = item.name.toLowerCase();
  if (/jardineira/.test(name)) return 'Jardineira';
  if (/mini|copo/.test(name)) return 'Copo/mini vaso';
  if (/(^|\s)g($|\s)|grande/.test(name)) return 'Grande';
  if (/(^|\s)m($|\s)|médio|medio/.test(name)) return 'Médio';
  if (/(^|\s)p($|\s)|pequeno/.test(name)) return 'Pequeno';
  return UNKNOWN_OPTION;
};

const buildStockRecommendationBundle = (stock: StockItem[], fields: Partial<Plant> & { species?: string; notes?: string } = {}): StockRecommendationBundle => {
  const substrate = normalizeChoice(fields.substrate);
  const drainage = normalizeChoice(fields.drainage);
  const filter = normalizeChoice(fields.filterMaterial);
  const pot = normalizeChoice(fields.potSize);

  const substrateMatch = findStockMatch(stock, fields.substrateMix || substrate) || getAvailableStockByUsageTag(stock, 'Substrato').at(0) || getAvailableStockByCategory(stock, 'Substratos').at(0) || stock.find(item => item.quantity > 0 && /(terra|substrato|húmus|humus|perlita|pinus)/i.test(item.name));
  const drainageMatch = findStockMatch(stock, fields.drainageLayer || drainage) || getAvailableStockByUsageTag(stock, 'Drenagem').at(0) || stock.find(item => item.quantity > 0 && /(argila|brita|areia|carvão|carvao)/i.test(item.name));
  const filterMatch = findStockMatch(stock, filter) || getAvailableStockByUsageTag(stock, 'Filtragem').at(0) || stock.find(item => item.quantity > 0 && /(manta|bidim|tela|filtro)/i.test(item.name));
  const potMatch = findStockMatch(stock, pot) || getAvailableStockByUsageTag(stock, 'Vaso').at(0) || getAvailableStockByCategory(stock, 'Vasos').at(0) || stock.find(item => item.quantity > 0 && /(vaso|jardineira|cachepot|recipiente|copo)/i.test(item.name));
  const fertilizerMatch = getAvailableStockByUsageTag(stock, 'Adubação').at(0) || getAvailableStockByCategory(stock, 'Fertilizantes').at(0);

  const substrateSuggestion = mapSubstrateOptionFromStock(substrateMatch);
  const drainageSuggestion = mapDrainageOptionFromStock(drainageMatch);
  const filterSuggestion = mapFilterOptionFromStock(filterMatch);
  const potSuggestion = mapPotOptionFromStock(potMatch);

  const makeItem = (
    key: StockRecommendationItem['key'],
    label: string,
    currentValue: string,
    suggestedValue: string,
    match: StockItem | undefined,
    missingHint: string,
    availableHint: string,
  ): StockRecommendationItem => {
    const currentMatch = findStockMatch(stock, currentValue);
    if (!isUnknownChoice(currentValue) && currentMatch) {
      return {
        key,
        label,
        recommended: currentValue,
        inventoryItem: currentMatch.name,
        status: 'current',
        hint: `${label}: sua escolha atual já conversa com o estoque por causa de ${currentMatch.name}.`,
      };
    }

    if (suggestedValue !== UNKNOWN_OPTION && match) {
      return {
        key,
        label,
        recommended: suggestedValue,
        inventoryItem: match.name,
        status: 'available',
        hint: availableHint.replace('{item}', match.name).replace('{value}', suggestedValue),
        applyValue: suggestedValue,
      };
    }

    return {
      key,
      label,
      recommended: currentValue !== UNKNOWN_OPTION ? currentValue : UNKNOWN_OPTION,
      status: 'missing',
      hint: missingHint,
      applyValue: currentValue !== UNKNOWN_OPTION ? currentValue : undefined,
    };
  };

  const items: StockRecommendationItem[] = [
    makeItem('substrate', 'Substrato', substrate, substrateSuggestion, substrateMatch, 'Ainda não há substrato ideal registrado no estoque para esta ficha.', 'Substrato sugerido: {value}, usando primeiro {item}.'),
    makeItem('drainage', 'Drenagem', drainage, drainageSuggestion, drainageMatch, 'A drenagem ideal ainda não aparece no estoque.', 'Drenagem sugerida: {value}, aproveitando {item}.'),
    makeItem('filterMaterial', 'Filtragem', filter, filterSuggestion, filterMatch, 'Não encontrei manta, tela ou filtro no estoque agora.', 'Filtragem sugerida: {value}, com {item}.'),
    makeItem('potSize', 'Vaso', pot, potSuggestion, potMatch, 'O estoque não mostra um vaso adequado no momento.', 'Recipiente sugerido: {value}, usando {item}.')
  ];

  const patch: Partial<Plant> = {};
  items.forEach(item => {
    if (item.status === 'available' && item.applyValue) {
      patch[item.key] = item.applyValue as any;
    }
  });

  const summaryParts = items.map(item => item.hint);
  if (fertilizerMatch) {
    summaryParts.push(`Adubação futura: ${fertilizerMatch.name} está disponível para manutenção quando a planta estiver estabelecida.`);
  }

  return {
    summary: summaryParts.join(' '),
    items,
    patch,
  };
};

const buildSmartStockSuggestion = (stock: StockItem[], fields: Partial<Plant> & { species?: string; notes?: string }) => buildStockRecommendationBundle(stock, fields).summary;


function StockSuggestionPanel({ summary, items, onApply, disabled, message }: { summary: string; items: StockRecommendationItem[]; onApply: () => void; disabled?: boolean; message?: string | null; }) {
  const statusStyles = {
    current: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    available: 'bg-blue-50 text-blue-700 border-blue-200',
    missing: 'bg-amber-50 text-amber-700 border-amber-200',
  } as const;

  const statusLabels = {
    current: 'já atende',
    available: 'sugerido',
    missing: 'falta no estoque',
  } as const;

  return (
    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <label className="text-xs font-bold text-amber-700 uppercase mb-2 block">Sugestão com base no estoque</label>
          <p className="text-sm text-amber-950 leading-relaxed">{summary}</p>
        </div>
        <button
          type="button"
          onClick={onApply}
          disabled={disabled}
          className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${disabled ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20'}`}
        >
          Aplicar sugestão
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.key} className="rounded-2xl border border-amber-200 bg-white/80 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-600">{item.label}</div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusStyles[item.status]}`}>
                {statusLabels[item.status]}
              </span>
            </div>
            <div className="text-sm font-semibold text-slate-900">{item.recommended}</div>
            <div className="flex flex-wrap gap-2">
              {item.inventoryItem && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                  Item: {item.inventoryItem}
                </span>
              )}
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800">
                {item.hint}
              </span>
            </div>
          </div>
        ))}
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [locations, setLocations] = useState<Location[]>([
    { id: '1', name: 'Varanda Principal', light: 'Sol Pleno', exposure: 'Norte', covered: false, receivesRain: true, sunPeriod: 'Dia inteiro', notes: 'Área aberta principal do jardim.' },
    { id: '2', name: 'Sacada Coberta', light: 'Meia Sombra', exposure: 'Leste', covered: true, receivesRain: false, sunPeriod: 'Parcial', notes: 'Boa para plantas que não gostam de sol muito forte.' },
    { id: '3', name: 'Prateleira Interna', light: 'Luz Indireta', exposure: 'Interno', covered: true, receivesRain: false, sunPeriod: 'Não recebe sol direto', notes: 'Ambiente interno iluminado.' },
  ]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [stock, setStock] = useState<StockItem[]>([
    { id: '1', name: 'Terra Vegetal', quantity: 10, unit: 'kg', minQuantity: 0, category: 'Substratos & Solos' },
    { id: '2', name: 'Húmus de Minhoca', quantity: 5, unit: 'kg', minQuantity: 0, category: 'Substratos & Solos' },
    { id: '3', name: 'NPK 10-10-10', quantity: 500, unit: 'g', minQuantity: 0, category: 'Fertilizantes & Adubos' },
    { id: '4', name: 'Vaso de Barro G', quantity: 3, unit: 'un', minQuantity: 0, category: 'Vasos & Recipientes' },
    { id: '5', name: 'Tesoura de Poda', quantity: 1, unit: 'un', minQuantity: 0, category: 'Ferramentas' },
  ]);
  const [germinations, setGerminations] = useState<Germination[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [settings, setSettings] = useState<AppSettings>({
    weatherMode: 'auto',
    gardenAddress: '',
    geminiApiKey: ''
  });
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [wateringConfirmation, setWateringConfirmation] = useState<{ type: 'frequency' | 'germination', frequency?: string } | null>(null);
  const [wateredToday, setWateredToday] = useState<string[]>([]); // Array of frequency names or 'germination'
  const [lastCheckDate, setLastCheckDate] = useState(new Date().toDateString());

  useEffect(() => {
    const checkDate = setInterval(() => {
      const today = new Date().toDateString();
      if (today !== lastCheckDate) {
        setWateredToday([]);
        setLastCheckDate(today);
      }
    }, 60000); // Check every minute
    return () => clearInterval(checkDate);
  }, [lastCheckDate]);


  const addToHistory = (item: Omit<HistoryItem, 'id' | 'date'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString()
    };
    setHistory(prev => [newItem, ...prev]);
  };


  const normalizeLocation = (location: Partial<Location>): Location => ({
    id: location.id || Math.random().toString(36).slice(2, 9),
    name: location.name || 'Novo ambiente',
    light: location.light || 'Meia Sombra',
    exposure: location.exposure || 'Interno',
    covered: location.covered ?? true,
    receivesRain: location.receivesRain ?? false,
    sunPeriod: location.sunPeriod || 'Parcial',
    notes: location.notes || '',
    image: location.image || '',
  });

  const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
    if (!raw) return fallback;
    try {
      if (raw === 'undefined' || raw === 'null') return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const dismissAlert = (alertId: string) => {
    setDismissedAlertIds(prev => prev.includes(alertId) ? prev : [...prev, alertId]);
    showToast('Alerta arquivado.');
  };

  const reactivateAlert = (alertId: string) => {
    setDismissedAlertIds(prev => prev.filter(id => id !== alertId));
    showToast('Alerta reativado.');
  };

  const clearDismissedAlerts = () => {
    setDismissedAlertIds([]);
    showToast('Alertas arquivados foram restaurados.');
  };

  // Constants
  const PLANT_CATALOG = [
    { name: 'Manjericão', light: 'Sol Pleno', water: 'Frequente', substrate: 'Rico em matéria orgânica' },
    { name: 'Suculenta', light: 'Sol Pleno/Meia Sombra', water: 'Espaçada', substrate: 'Arenoso/Drenado' },
    { name: 'Samambaia', light: 'Luz Indireta', water: 'Úmido', substrate: 'Fibroso/Rico' },
    { name: 'Espada de São Jorge', light: 'Qualquer', water: 'Rara', substrate: 'Qualquer' },
  ];

  // Fetch Real Weather
  const fetchWeather = async (forceSettings?: AppSettings) => {
    setLoadingWeather(true);
    const currentSettings = forceSettings || settings;
    const dayKey = getDayKey();
    const manualAddress = (currentSettings.gardenAddress || '').trim();
    const cacheKey = getWeatherCacheKey({ ...currentSettings, gardenAddress: manualAddress });
    const cachedWeather = safeJsonParse<any>(localStorage.getItem(cacheKey), null);
    if (cachedWeather?.dayKey === dayKey && cachedWeather?.weather && cachedWeather?.forecast) {
      setWeather(cachedWeather.weather);
      setForecast(cachedWeather.forecast);
      setLoadingWeather(false);
      return;
    }

    const weatherCodeMap: Record<number, string> = {
      0: 'Céu Limpo', 1: 'Principalmente Limpo', 2: 'Parcialmente Nublado', 3: 'Nublado',
      45: 'Nevoeiro', 48: 'Nevoeiro com geada', 51: 'Garoa Leve', 61: 'Chuva Leve',
      80: 'Pancadas de Chuva', 95: 'Trovoada'
    };

    const persistWeather = (nextWeather: WeatherData, nextForecast: ForecastData) => {
      setWeather(nextWeather);
      setForecast(nextForecast);
      safeLocalStorageSet(cacheKey, JSON.stringify({ dayKey, weather: nextWeather, forecast: nextForecast }));
    };

    const applyTemporaryWeather = (nextWeather: WeatherData, nextForecast: ForecastData) => {
      setWeather(nextWeather);
      setForecast(nextForecast);
    };

    const buildFallbackForecast = (): ForecastData => ({ tempMax: 27, tempMin: 20, condition: 'Variável', rainProb: 10 });

    const getWeatherData = async (latitude: number, longitude: number, label: string) => {
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`);
        const data = await response.json();
        const nextWeather: WeatherData = {
          temp: Math.round(data.current.temperature_2m),
          condition: weatherCodeMap[data.current.weather_code] || 'Variável',
          humidity: data.current.relative_humidity_2m,
          wind: Math.round(data.current.wind_speed_10m),
          rainProb: data.daily.precipitation_probability_max[0],
          locationName: label
        };
        const nextForecast: ForecastData = {
          tempMax: Math.round(data.daily.temperature_2m_max[1]),
          tempMin: Math.round(data.daily.temperature_2m_min[1]),
          condition: weatherCodeMap[data.daily.weather_code[1]] || 'Variável',
          rainProb: data.daily.precipitation_probability_max[1]
        };
        persistWeather(nextWeather, nextForecast);
      } catch (e) {
        console.error('Weather fetch error', e);
        applyTemporaryWeather(
          { temp: 25, condition: 'Clima indisponível', humidity: 50, wind: 0, rainProb: 0, locationName: label },
          buildFallbackForecast()
        );
      } finally {
        setLoadingWeather(false);
      }
    };

    if (currentSettings.weatherMode === 'manual') {
      if (!manualAddress) {
        applyTemporaryWeather(
          { temp: 25, condition: 'Endereço manual pendente', humidity: 50, wind: 0, rainProb: 0, locationName: 'Salve um endereço do jardim' },
          buildFallbackForecast()
        );
        setLoadingWeather(false);
        return;
      }
      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(manualAddress)}&count=1&language=pt&format=json`);
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          const { latitude, longitude, name, admin1 } = geoData.results[0];
          await getWeatherData(latitude, longitude, `${name}${admin1 ? `, ${admin1}` : ''}`);
        } else {
          applyTemporaryWeather(
            { temp: 25, condition: 'Endereço não encontrado', humidity: 50, wind: 0, rainProb: 0, locationName: manualAddress },
            buildFallbackForecast()
          );
          setLoadingWeather(false);
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        applyTemporaryWeather(
          { temp: 25, condition: 'Falha ao localizar endereço', humidity: 50, wind: 0, rainProb: 0, locationName: manualAddress },
          buildFallbackForecast()
        );
        setLoadingWeather(false);
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await getWeatherData(position.coords.latitude, position.coords.longitude, 'Sua Localização');
      },
      () => {
        const fallbackWeather: WeatherData = { temp: 25, condition: 'Localização Desativada', humidity: 50, wind: 10, rainProb: 0, locationName: manualAddress ? `Endereço salvo: ${manualAddress}` : 'Configure um endereço' };
        const fallbackForecast: ForecastData = buildFallbackForecast();
        persistWeather(fallbackWeather, fallbackForecast);
        setLoadingWeather(false);
      }
    );
  };

  // Load initial data
  useEffect(() => {
    // Try multiple possible keys from previous versions
    const possibleKeys = ['atena_garden_full_data', 'atena_garden_data', 'garden_data', 'plants_data'];
    let savedData = null;
    
    for (const key of possibleKeys) {
      const data = localStorage.getItem(key);
      if (data && data !== 'undefined') {
        savedData = data;
        break;
      }
    }

    if (savedData) {
      const parsed: any = safeJsonParse(savedData, {});
      // Handle both old and new formats
      const plantsList = parsed.plants || parsed.plantsData || [];
      const stockList = parsed.stock || parsed.stockData || [];
      const logsList = parsed.logs || [];
      const germinationsList = parsed.germinations || [];
      const tasksList = parsed.tasks || [];
      const historyList = parsed.history || [];
      const locationsList = parsed.locations || [];

      if (plantsList.length > 0) setPlants(plantsList.map((plant: any) => normalizePlantRecord(plant)));
      if (logsList.length > 0) setLogs(logsList);
      if (stockList.length > 0) setStock(stockList.map((item: any) => normalizeStockRecord({ category: item.category || 'Insumos Gerais', usageTags: inferStockUsageTags(item), ...item })));
      if (germinationsList.length > 0) setGerminations(germinationsList.map((item: any) => normalizeGerminationRecord(item)));
      if (tasksList.length > 0) setTasks(tasksList);
      if (historyList.length > 0) setHistory(historyList);
      if (locationsList.length > 0) setLocations(locationsList.map((location: any) => normalizeLocation(location)));
    } else {
      // Default data
      setPlants([
        normalizePlantRecord({ id: '1', name: 'Manjericão', species: 'Ocimum basilicum', locationId: '1', status: 'Saudável', wateringFrequency: 'Diária', lastWatered: new Date().toISOString(), potSize: 'Médio', substrateMix: 'Terra Vegetal + Húmus' }),
        normalizePlantRecord({ id: '2', name: 'Lírio da Paz', species: 'Spathiphyllum', locationId: '3', status: 'Saudável', wateringFrequency: 'Semanal' }),
        normalizePlantRecord({ id: '3', name: 'Babosa', species: 'Aloe vera', locationId: '2', status: 'Recuperação', wateringFrequency: 'Quinzenal' }),
      ]);
      setStock([
        normalizeStockRecord({ id: '1', name: 'Terra Vegetal', quantity: 5, unit: 'kg', minQuantity: 0, category: 'Substratos & Solos', usageTags: ['Substrato'], locationId: '2' }),
        normalizeStockRecord({ id: '2', name: 'Húmus de Minhoca', quantity: 1, unit: 'kg', minQuantity: 0, category: 'Substratos & Solos', usageTags: ['Substrato', 'Adubação'], locationId: '2' }),
      ]);
      setTasks([
        { id: '1', title: 'Adubar Manjericão', date: 'Hoje, 14:00', completed: false, plantId: '1' },
        { id: '2', title: 'Trocar vaso da Babosa', date: 'Amanhã', completed: false, plantId: '3' },
      ]);
    }

    const savedSettings = localStorage.getItem('atena_garden_settings');
    const localGeminiKey = getSavedGeminiKey();
    if (savedSettings && savedSettings !== 'undefined') {
      const parsed = safeJsonParse<any>(savedSettings, {});
      const mergedSettings = { ...parsed, geminiApiKey: localGeminiKey || parsed.geminiApiKey || '' };
      setSettings(mergedSettings);
      fetchWeather(mergedSettings);
    } else {
      const initialSettings: AppSettings = { weatherMode: 'auto', gardenAddress: '', geminiApiKey: localGeminiKey };
      setSettings(initialSettings);
      fetchWeather(initialSettings);
    }
  }, []);

  useEffect(() => {
    const savedDismissed = localStorage.getItem('atena_garden_dismissed_alerts');
    const parsed = safeJsonParse<string[]>(savedDismissed, []);
    if (Array.isArray(parsed)) setDismissedAlertIds(parsed);
  }, []);

  useEffect(() => {
    safeLocalStorageSet('atena_garden_dismissed_alerts', JSON.stringify(dismissedAlertIds));
  }, [dismissedAlertIds]);

  useEffect(() => {
    const dataToSave = { plants, logs, stock, germinations, tasks, history, locations };
    safeLocalStorageSet('atena_garden_full_data', JSON.stringify(dataToSave));
  }, [plants, logs, stock, germinations, tasks, history, locations]);

  const saveSettings = (newSettings: AppSettings) => {
    const sanitizedSettings = { ...newSettings, geminiApiKey: newSettings.geminiApiKey || '' };
    setSettings(sanitizedSettings);
    safeLocalStorageSet('atena_garden_settings', JSON.stringify({ ...sanitizedSettings, geminiApiKey: '' }));
    if (sanitizedSettings.geminiApiKey) {
      saveGeminiKeyLocally(sanitizedSettings.geminiApiKey);
    } else {
      clearGeminiKeyLocally();
    }
    fetchWeather(sanitizedSettings);
  };

  const handleBulkWater = (type: 'frequency' | 'germination', frequency?: string) => {
    const now = new Date().toISOString();
    const newLogs: Log[] = [];

    if (type === 'frequency' && frequency) {
      const plantsToWater = plants.filter(p => p.wateringFrequency === frequency);
      if (plantsToWater.length === 0) return;

      setPlants(prev => prev.map(p => 
        p.wateringFrequency === frequency 
          ? normalizePlantRecord({ ...p, lastWatered: now }) 
          : p
      ));

      plantsToWater.forEach(p => {
        newLogs.push({
          id: Math.random().toString(36).substr(2, 9),
          plantId: p.id,
          date: now,
          action: 'Rega',
          notes: `Rega coletiva (${frequency})`
        });
        addToHistory({
          type: 'Rega',
          title: `Rega Coletiva: ${p.name}`,
          details: `Regada via ação coletiva (${frequency})`,
          plantId: p.id
        });
      });
      setWateredToday(prev => [...prev, frequency]);
    } else if (type === 'germination') {
      const activeGerminations = germinations.filter(g => g.status === 'Em andamento');
      if (activeGerminations.length === 0) return;

      setGerminations(prev => prev.map(g => 
        g.status === 'Em andamento' 
          ? { ...g, lastWatered: now } 
          : g
      ));

      activeGerminations.forEach(g => {
        newLogs.push({
          id: Math.random().toString(36).substr(2, 9),
          plantId: g.id,
          date: now,
          action: 'Rega',
          notes: `Rega coletiva (Germinação: ${g.name})`
        });
      });
      setWateredToday(prev => [...prev, 'germination']);
    }

    if (newLogs.length > 0) {
      setLogs(prev => [...newLogs, ...prev]);
      setToast(`Regas concluídas para: ${type === 'germination' ? 'Germinando' : frequency}`);
      setTimeout(() => setToast(null), 3000);
      setWateringConfirmation(null);
    }
  };

  const handleWaterPlant = (plantId: string) => {
    const now = new Date().toISOString();
    const plant = plants.find(p => p.id === plantId);
    if (!plant) return;

    setPlants(prev => prev.map(p => 
      p.id === plantId ? normalizePlantRecord({ ...p, lastWatered: now }) : p
    ));

    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      plantId,
      date: now,
      action: 'Rega',
      notes: `Rega individual de ${plant.name}`
    }, ...prev]);

    addToHistory({
      type: 'Rega',
      title: `Rega: ${plant.name}`,
      details: `Planta regada com sucesso.`,
      plantId
    });

    setToast(`Rega registrada para ${plant.name}`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdatePlant = (updatedPlant: Plant) => {
    setPlants(prev => {
      let newPlants = prev.map(p => p.id === updatedPlant.id ? normalizePlantRecord(updatedPlant) : p);
      
      // Se a planta atualizada foi marcada como favorita, desmarca as outras para manter apenas um fundo
      if (updatedPlant.isFavorite) {
        newPlants = newPlants.map(p => p.id !== updatedPlant.id ? { ...p, isFavorite: false } : p);
      }
      
      return newPlants;
    });
    
    addToHistory({
      type: 'Atualização',
      title: `Atualização: ${updatedPlant.name}`,
      details: updatedPlant.isFavorite ? `Planta favoritada para o fundo do jardim.` : `Dados da planta atualizados.`,
      plantId: updatedPlant.id
    });

    setToast(updatedPlant.isFavorite ? `"${updatedPlant.name}" agora é o seu fundo favorito!` : `Dados de ${updatedPlant.name} atualizados`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeletePlant = (plantId: string) => {
    const plant = plants.find(p => p.id === plantId);
    if (!plant) return;

    setPlants(prev => prev.filter(p => p.id !== plantId));
    setLogs(prev => prev.filter(log => log.plantId !== plantId));

    addToHistory({
      type: 'Atualização',
      title: `Planta removida: ${plant.name}`,
      details: 'Cadastro excluído manualmente do jardim.'
    });

    setToast(`${plant.name} foi removida do jardim`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleRepotPlant = (plantId: string, details: { potSize?: string, substrate?: string, drainage?: string, filterMaterial?: string }) => {
    const now = new Date().toISOString();
    const plant = plants.find(p => p.id === plantId);
    if (!plant) return;

    const updatedPlant = { 
      ...plant, 
      ...details, 
      lastRepotted: now 
    };

    setPlants(prev => prev.map(p => p.id === plantId ? updatedPlant : p));

    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      plantId,
      date: now,
      action: 'Troca de Vaso',
      notes: `Replantio de ${plant.name}. Novo vaso: ${details.potSize || 'N/A'}`
    }, ...prev]);

    addToHistory({
      type: 'Replantio',
      title: `Replantio: ${plant.name}`,
      details: `Planta replantada.\nSubstrato: ${details.substrate || 'N/A'}\nDrenagem: ${details.drainage || 'N/A'}\nMaterial: ${details.filterMaterial || 'N/A'}`,
      plantId
    });

    setToast(`Replantio registrado para ${plant.name}`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveLocation = (location: Location) => {
    const normalized = normalizeLocation(location);
    setLocations(prev => {
      const exists = prev.some(l => l.id === normalized.id);
      return exists ? prev.map(l => l.id === normalized.id ? normalized : l) : [...prev, normalized];
    });
    addToHistory({
      type: 'Atualização',
      title: `Ambiente ${locations.some(l => l.id === normalized.id) ? 'atualizado' : 'criado'}: ${normalized.name}`,
      details: `${normalized.light} • ${normalized.covered ? 'Coberto' : 'Descoberto'} • ${normalized.sunPeriod || 'Parcial'}`,
    });
    showToast(`Ambiente ${normalized.name} salvo com sucesso`);
  };

  const handleDeleteLocation = (locationId: string) => {
    const location = locations.find(l => l.id === locationId);
    if (!location) return;
    const hasPlants = plants.some(p => p.locationId === locationId);
    if (hasPlants) {
      showToast('Mova as plantas deste ambiente antes de excluí-lo.');
      return;
    }
    setLocations(prev => prev.filter(l => l.id !== locationId));
    addToHistory({
      type: 'Atualização',
      title: `Ambiente removido: ${location.name}`,
      details: 'Ambiente excluído manualmente do jardim.'
    });
    showToast(`Ambiente ${location.name} removido`);
  };

  const handleApplyLightToLocation = (locationId: string, analysis: LightAnalysisResult) => {
    const current = locations.find(location => location.id === locationId);
    if (!current) {
      showToast('Escolha um ambiente válido para aplicar a medição de luz.');
      return;
    }

    const updated = normalizeLocation({
      ...current,
      light: analysis.level,
      sunPeriod: analysis.sunPeriod,
      notes: [current.notes, `Leitura local: ${analysis.explanation}`, analysis.middayTip].filter(Boolean).join('\n'),
    });

    setLocations(prev => prev.map(location => location.id === locationId ? updated : location));
    addToHistory({
      type: 'Atualização',
      title: `Luminosidade atualizada em ${updated.name}`,
      details: `${updated.light} • ${updated.sunPeriod}\n${analysis.explanation}\n${analysis.middayTip}`,
    });
    showToast(`Leitura de luz aplicada ao ambiente ${updated.name}.`);
  };

  const handleUpdateGermination = (updated: Germination) => {
    setGerminations(prev => prev.map(g => g.id === updated.id ? normalizeGerminationRecord(updated) : g));
  };

  const handleDeleteGermination = (germinationId: string) => {
    const germination = germinations.find(g => g.id === germinationId);
    if (!germination) return;
    setGerminations(prev => prev.filter(g => g.id !== germinationId));
    addToHistory({
      type: 'Atualização',
      title: `Germinação removida: ${germination.name}`,
      details: 'Registro de germinação excluído manualmente.'
    });
    showToast(`Germinação de ${germination.name} removida`);
  };

  const handleTransferGerminationToPlant = (germinationId: string, payload: Partial<Plant> = {}) => {
    const germination = germinations.find(g => g.id === germinationId);
    if (!germination) return;
    if (germination.transferredPlantId) {
      showToast('Esta germinação já foi transferida para o jardim.');
      return;
    }

    const targetLocationId = payload.locationId || locations[0]?.id || '1';
    const newPlant: Plant = {
      id: Math.random().toString(36).slice(2, 9),
      name: payload.name || germination.name,
      species: payload.species || germination.species || '',
      locationId: targetLocationId,
      status: 'Muda',
      wateringFrequency: payload.wateringFrequency || 'Semanal',
      notes: [
        payload.notes,
        germination.notes,
        germination.plantingInstructions ? `Plantio: ${germination.plantingInstructions}` : '',
        germination.germinationTechniques ? `Técnicas de germinação: ${germination.germinationTechniques}` : '',
        germination.wateringTips ? `Rega: ${germination.wateringTips}` : ''
      ].filter(Boolean).join('\n\n'),
      image: payload.image || germination.image,
      lastWatered: new Date().toISOString(),
      lastRepotted: '',
      potSize: payload.potSize || 'Copo/mini vaso',
      substrateMix: payload.substrateMix || '',
      drainageLayer: payload.drainageLayer || '',
      substrate: payload.substrate || '',
      drainage: payload.drainage || '',
      filterMaterial: payload.filterMaterial || '',
      isFavorite: false,
      createdAt: new Date().toISOString(),
      photoHistory: (payload.image || germination.image) ? [createPhotoEntry(payload.image || germination.image!, 'Registro inicial vindo da germinação', 'Germinação')] : [],
    };

    setPlants(prev => [normalizePlantRecord(newPlant), ...prev]);
    setGerminations(prev => prev.map(g => g.id === germinationId ? { ...g, status: 'Transferida', transferredPlantId: newPlant.id, transferredAt: new Date().toISOString() } : g));
    addToHistory({
      type: 'Atualização',
      title: `Transferida para o jardim: ${newPlant.name}`,
      details: `A germinação virou uma planta no ambiente ${locations.find(l => l.id === targetLocationId)?.name || 'Selecionado'}.`,
      image: newPlant.image,
      plantId: newPlant.id,
    });
    showToast(`${newPlant.name} agora faz parte do jardim`);
    setActiveTab('plants');
  };


  const filteredPlants = useMemo(() => {
    return plants.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.species?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [plants, searchQuery]);

  const allAlerts = useMemo<GardenAlert[]>(() => {
    const generated: GardenAlert[] = [];

    plants.forEach((plant) => {
      if (plant.status === 'Problema') {
        generated.push({
          id: `plant-problem-${plant.id}`,
          title: `${plant.name} precisa de atenção`,
          details: `A planta está marcada como Problema. Revise sintomas, rega, substrato e ambiente.`,
          severity: 'alta',
          category: 'Plantas',
          targetTab: 'plants',
          createdAt: plant.lastWatered || new Date().toISOString(),
        });
      }
      if (plant.status === 'Recuperação') {
        generated.push({
          id: `plant-recovery-${plant.id}`,
          title: `${plant.name} está em recuperação`,
          details: `Acompanhe a evolução da planta e confirme se o novo local, luz e rega estão adequados.`,
          severity: 'media',
          category: 'Plantas',
          targetTab: 'plants',
          createdAt: plant.lastWatered || new Date().toISOString(),
        });
      }
    });

    const firstWaterPlants = plants.filter(p => !p.lastWatered);
    if (firstWaterPlants.length > 0) {
      generated.push({
        id: 'plants-missing-first-water',
        title: `${firstWaterPlants.length} planta(s) sem rega registrada`,
        details: `Há plantas cadastradas sem nenhuma rega lançada. Confira a aba Minhas Plantas para atualizar o histórico.`,
        severity: 'media',
        category: 'Plantas',
        targetTab: 'plants',
      });
    }

    const ongoingGerminations = germinations.filter(g => g.status === 'Em andamento');
    ongoingGerminations.forEach((g) => {
      const elapsedDays = Math.max(0, Math.ceil((Date.now() - new Date(g.startDate).getTime()) / 86400000));
      if (elapsedDays > g.expectedDays + 2) {
        generated.push({
          id: `germination-overdue-${g.id}`,
          title: `${g.name} está demorando para germinar`,
          details: `A germinação já está em ${elapsedDays} dias, acima da previsão de ${g.expectedDays}. Revise umidade, luz e técnicas sugeridas.`,
          severity: 'media',
          category: 'Germinação',
          targetTab: 'seeds',
        });
      }
    });

    germinations.filter(g => g.status === 'Sucesso' && !g.transferredPlantId).forEach((g) => {
      generated.push({
        id: `germination-transfer-${g.id}`,
        title: `${g.name} já pode ir para o jardim`,
        details: `A germinação foi marcada como sucesso e pode ser transferida automaticamente para virar uma planta do jardim.`,
        severity: 'baixa',
        category: 'Germinação',
        targetTab: 'seeds',
      });
    });

    if (weather) {
      if (weather.temp >= 32) {
        generated.push({
          id: 'weather-heat',
          title: 'Calor forte hoje',
          details: `Temperatura atual em ${weather.temp}°C. Considere revisar umidade e possível rega extra no fim do dia para plantas sensíveis.`,
          severity: 'media',
          category: 'Clima',
          targetTab: 'dashboard',
        });
      }
      const uncoveredPlants = plants.filter(p => {
        const location = locations.find(l => l.id === p.locationId);
        return location && !location.covered;
      }).length;
      if (weather.rainProb >= 70 && uncoveredPlants > 0) {
        generated.push({
          id: 'weather-rain',
          title: 'Chuva provável para plantas descobertas',
          details: `A chance de chuva está em ${weather.rainProb}% e você tem ${uncoveredPlants} planta(s) em ambiente descoberto.`,
          severity: 'media',
          category: 'Clima',
          targetTab: 'places',
        });
      }
    }

    return generated;
  }, [plants, stock, germinations, weather, locations]);

  const activeAlerts = useMemo(() => allAlerts.filter(alert => !dismissedAlertIds.includes(alert.id)), [allAlerts, dismissedAlertIds]);
  const archivedAlerts = useMemo(() => allAlerts.filter(alert => dismissedAlertIds.includes(alert.id)), [allAlerts, dismissedAlertIds]);

  const stats = {
    total: plants.length,
    alerts: activeAlerts.length,
    wateringDue: plants.filter(p => !p.lastWatered).length,
    germinating: germinations.filter(g => g.status === 'Em andamento').length,
    stockItems: stock.length
  };

  const favoritePlant = useMemo(() => plants.find(p => p.isFavorite), [plants]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col md:flex-row font-sans relative overflow-hidden">
      {/* Background Personalizado */}
      {favoritePlant?.image && (
        <div 
          className="fixed inset-0 pointer-events-none z-0 opacity-[0.07] transition-all duration-1000"
          style={{ 
            backgroundImage: `url(${favoritePlant.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(10px)'
          }}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-emerald-500/20 border border-emerald-100 bg-white">
            <img src="/icon-192.png" alt="Atena Garden" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-xl tracking-tight text-emerald-900">Atena Garden</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
          <SidebarLink icon={LayoutDashboard} label="Painel" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarLink icon={AlertCircle} label={`Alertas (${activeAlerts.length})`} active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} />
          
          <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jardim</div>
          <SidebarLink icon={Sprout} label="Minhas Plantas" active={activeTab === 'plants'} onClick={() => setActiveTab('plants')} />
          <SidebarLink icon={MapPin} label="Ambientes" active={activeTab === 'places'} onClick={() => setActiveTab('places')} />
          <SidebarLink icon={FlaskConical} label="Sementes & Germinação" active={activeTab === 'seeds'} onClick={() => setActiveTab('seeds')} />
          <SidebarLink icon={StockIcon} label="Estoque" active={activeTab === 'stock'} onClick={() => setActiveTab('stock')} />
          
          <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ferramentas</div>
          <SidebarLink icon={Scan} label="Identificar Planta" active={activeTab === 'identify'} onClick={() => setActiveTab('identify')} />
          
          <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Histórico</div>
          <SidebarLink icon={LogsIcon} label="Histórico de Regas" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          <SidebarLink icon={History} label="Histórico de Dados" active={activeTab === 'data-history'} onClick={() => setActiveTab('data-history')} />
          
          <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conteúdo</div>
          <SidebarLink icon={BookOpen} label="Guia de Cultivo" active={activeTab === 'guide'} onClick={() => setActiveTab('guide')} />
          <SidebarLink icon={FileText} label="Relatórios" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
        </nav>

        <div className="pt-6 border-t border-slate-100">
          <SidebarLink icon={Settings} label="Configurações" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>
      </aside>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 px-2 pt-3 pb-6 flex items-end justify-between z-[100] overflow-visible shadow-[0_-4px_20px_rgba(0,0,0,0.05)] gap-1">
        <div className="flex flex-1 items-end justify-around">
          <MobileNavItem icon={LayoutDashboard} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <MobileNavItem icon={Sprout} active={activeTab === 'plants'} onClick={() => setActiveTab('plants')} />
          <MobileNavItem icon={MapPin} active={activeTab === 'places'} onClick={() => setActiveTab('places')} />
        </div>
        <div className="relative -top-10 px-1 overflow-visible shrink-0">
          <button 
            onClick={() => setActiveTab('identify')}
            className={`w-18 h-18 rounded-full flex items-center justify-center text-white shadow-[0_8px_30px_rgba(16,185,129,0.4)] border-4 border-white transition-all active:scale-95 ${activeTab === 'identify' ? 'bg-emerald-600 scale-110' : 'bg-emerald-500'}`}
          >
            <Scan className="w-9 h-9" />
          </button>
        </div>
        <div className="flex flex-1 items-end justify-around">
          <MobileNavItem icon={AlertCircle} active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} />
          <MobileNavItem icon={StockIcon} active={activeTab === 'stock'} onClick={() => setActiveTab('stock')} />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 pb-24 md:pb-10 overflow-y-auto relative z-10">
        <AnimatePresence>
          {wateringConfirmation && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
              >
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <Water className="w-10 h-10 text-emerald-600" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900">Confirmar Rega</h3>
                  <p className="text-slate-500">
                    Você confirma que a rega de <span className="font-bold text-emerald-600">{wateringConfirmation.type === 'germination' ? 'Germinação' : wateringConfirmation.frequency}</span> foi feita?
                  </p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setWateringConfirmation(null)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => handleBulkWater(wateringConfirmation.type, wateringConfirmation.frequency)}
                    className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    Sim, Confirmar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Olá, Jardineiro!</h1>
            <p className="text-slate-500">Seu jardim está com {stats.alerts} alertas hoje.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar plantas..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => setActiveTab('alerts')}
              className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-semibold text-slate-700 hover:border-amber-300 hover:bg-amber-50 transition-colors"
            >
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <span className="hidden sm:inline">Alertas</span>
              <span className="inline-flex min-w-6 justify-center rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">{activeAlerts.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className="md:hidden flex items-center justify-center bg-white border border-slate-200 px-3 py-2.5 rounded-xl font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              aria-label="Abrir configurações"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setActiveTab('identify')}
              className="hidden md:flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Scan className="w-5 h-5" /> Identificar e Adicionar
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <DashboardView 
              weather={weather} 
              loadingWeather={loadingWeather} 
              fetchWeather={fetchWeather} 
              forecast={forecast} 
              stats={stats} 
              filteredPlants={filteredPlants} 
              locations={locations} 
              setActiveTab={setActiveTab} 
              tasks={tasks}
              setWateringConfirmation={setWateringConfirmation}
              history={history}
              wateredToday={wateredToday}
              activeAlerts={activeAlerts}
              stock={stock}
              germinations={germinations}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsView
              alerts={activeAlerts}
              archivedAlerts={archivedAlerts}
              onOpenTab={(tab: string) => setActiveTab(tab)}
              onDismiss={dismissAlert}
              onReactivate={reactivateAlert}
              onRestoreAll={clearDismissedAlerts}
            />
          )}

          {activeTab === 'plants' && (
            <PlantsView 
              filteredPlants={filteredPlants} 
              locations={locations} 
              onWater={handleWaterPlant}
              onUpdate={handleUpdatePlant}
              onRepot={handleRepotPlant}
              onDelete={handleDeletePlant}
              onAdd={() => setActiveTab('identify')}
            />
          )}

          {activeTab === 'places' && (
            <PlacesView 
              locations={locations} 
              plants={plants} 
              onSaveLocation={handleSaveLocation}
              onDeleteLocation={handleDeleteLocation}
              addToHistory={addToHistory}
            />
          )}

          {activeTab === 'seeds' && (
            <SeedsView 
              stock={stock}
              germinations={germinations}
              locations={locations}
              onStartGermination={(g: Germination) => {
                setGerminations(prev => [g, ...prev]);
                showToast(`Germinação de "${g.name}" iniciada!`);
              }}
              onUpdateGermination={handleUpdateGermination}
              onDeleteGermination={handleDeleteGermination}
              onTransferToGarden={handleTransferGerminationToPlant}
              addToHistory={addToHistory}
            />
          )}

          {activeTab === 'stock' && (
            <StockView stock={stock} setStock={setStock} addToHistory={addToHistory} locations={locations} />
          )}

          {activeTab === 'logs' && (
            <LogsView logs={logs} plants={plants} />
          )}

          {activeTab === 'data-history' && (
            <HistoryView history={history} />
          )}

          {activeTab === 'guide' && (
            <GuideView catalog={PLANT_CATALOG} />
          )}

          {activeTab === 'reports' && (
            <ReportsView data={{ plants, logs, stock, germinations, tasks }} />
          )}

          {activeTab === 'light-meter' && (
            <LightMeterView />
          )}

          {activeTab === 'identify' && (
            <IdentifyPlantView 
              addPlant={(p: any) => {
                setPlants(prev => [...prev, p]);
                setActiveTab('plants');
                setToast(`Planta "${p.name}" adicionada com sucesso!`);
                setTimeout(() => setToast(null), 3000);
              }} 
              locations={locations}
              stock={stock}
              addToHistory={addToHistory}
              onApplyLightToLocation={handleApplyLightToLocation}
            />
          )}


          {activeTab === 'settings' && (
            <SettingsView 
              settings={settings} 
              saveSettings={saveSettings} 
              setSettings={setSettings} 
              data={{ plants, logs, stock, germinations, tasks, locations, history }}
            />
          )}
        </AnimatePresence>

        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed top-4 md:top-auto md:bottom-10 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl z-[260] font-bold flex items-center gap-2 w-[calc(100%-2rem)] max-w-xl justify-center text-center"
            >
              <CheckCircle2 className="w-5 h-5" /> {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- View Components ---

function DashboardView({ weather, loadingWeather, fetchWeather, forecast, stats, filteredPlants, locations, setActiveTab, tasks, setWateringConfirmation, history, wateredToday, activeAlerts, stock, germinations }: any) {
  return (
    <motion.div 
      key="dashboard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-10"
    >
      {/* Weather & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-emerald-900 rounded-3xl p-10 text-white relative overflow-hidden shadow-2xl shadow-emerald-900/20">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-emerald-300 font-medium">
                <MapPin className="w-4 h-4" /> {weather?.locationName || 'Buscando...'}
              </div>
              <button onClick={fetchWeather} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <RefreshCw className={`w-4 h-4 ${loadingWeather ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {loadingWeather ? (
              <div className="h-32 flex items-center justify-center">
                <div className="animate-pulse text-emerald-400">Atualizando clima...</div>
              </div>
            ) : (
              <>
                <div className="flex items-end gap-6 mb-10">
                  <div className="text-7xl font-bold tracking-tighter">{weather?.temp}°C</div>
                  <div className="mb-2">
                    <div className="text-2xl font-semibold">{weather?.condition}</div>
                    <div className="text-emerald-300">Tempo Real</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
                  <WeatherStat icon={Droplets} label="Umidade" value={`${weather?.humidity}%`} />
                  <WeatherStat icon={Wind} label="Vento" value={`${weather?.wind} km/h`} />
                  <WeatherStat icon={CloudRain} label="Chuva" value={`${weather?.rainProb}%`} />
                </div>
              </>
            )}
          </div>
          <Sun className="absolute -right-10 -top-10 w-64 h-64 text-white/5 animate-pulse" />
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900">Amanhã</h3>
              <Calendar className="w-4 h-4 text-emerald-500" />
            </div>
            {loadingWeather ? (
              <div className="h-20 animate-pulse bg-slate-50 rounded-2xl" />
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-slate-900">{forecast?.tempMax}° / {forecast?.tempMin}°</div>
                  <div className="text-sm text-slate-500 font-medium">{forecast?.condition}</div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-emerald-600 font-bold">
                    <CloudRain className="w-4 h-4" /> {forecast?.rainProb}%
                  </div>
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Prob. Chuva</div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6">Estatísticas Gerais</h3>
            <div className="space-y-4">
              <StatRow label="Plantas" value={stats.total} color="bg-blue-500" />
              <StatRow label="Alertas" value={stats.alerts} color="bg-amber-500" />
              <StatRow label="Germinação" value={stats.germinating} color="bg-purple-500" />
              <StatRow label="Itens no Estoque" value={stats.stockItems} color="bg-emerald-500" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-amber-500" /> Alertas do Jardim</h3>
                <p className="text-sm text-slate-500 mt-1">Veja o que precisa de ação agora e abra a área certa do app.</p>
              </div>
              <button onClick={() => setActiveTab('alerts')} className="text-emerald-600 font-semibold text-sm hover:underline">Gerenciar</button>
            </div>
            <div className="space-y-3">
              {activeAlerts.length === 0 ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 font-medium">Nenhum alerta ativo no momento.</div>
              ) : (
                activeAlerts.slice(0, 3).map((alert: GardenAlert) => (
                  <button key={alert.id} onClick={() => setActiveTab(alert.targetTab || 'alerts')} className="w-full text-left rounded-2xl border border-slate-200 px-4 py-4 hover:border-emerald-200 hover:bg-emerald-50/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 inline-flex h-2.5 w-2.5 rounded-full ${alert.severity === 'alta' ? 'bg-red-500' : alert.severity === 'media' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{alert.title}</div>
                        <div className="text-sm text-slate-500 mt-1 line-clamp-2">{alert.details}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <GardenSummary plants={filteredPlants} locations={locations} />
        </div>
      </div>

      {/* Bulk Watering Shortcuts */}
      <section className="bg-white rounded-3xl p-10 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Water className="text-emerald-500" /> Regas Coletivas
          </h2>
          <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Atalhos Rápidos</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          <BulkWaterButton 
            label="Germinando" 
            onClick={() => setWateringConfirmation({ type: 'germination' })} 
            color="bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100"
            isDone={wateredToday.includes('germination')}
          />
          <BulkWaterButton 
            label="Diárias" 
            onClick={() => setWateringConfirmation({ type: 'frequency', frequency: 'Diária' })} 
            color="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
            isDone={wateredToday.includes('Diária')}
          />
          <BulkWaterButton 
            label="Semanal" 
            onClick={() => setWateringConfirmation({ type: 'frequency', frequency: 'Semanal' })} 
            color="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
            isDone={wateredToday.includes('Semanal')}
          />
          <BulkWaterButton 
            label="Quinzenal" 
            onClick={() => setWateringConfirmation({ type: 'frequency', frequency: 'Quinzenal' })} 
            color="bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100"
            isDone={wateredToday.includes('Quinzenal')}
          />
          <BulkWaterButton 
            label="Mensal" 
            onClick={() => setWateringConfirmation({ type: 'frequency', frequency: 'Mensal' })} 
            color="bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100"
            isDone={wateredToday.includes('Mensal')}
          />
        </div>
      </section>

      {/* Plants Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Plantas em Destaque</h2>
          <button onClick={() => setActiveTab('plants')} className="text-emerald-600 font-semibold flex items-center gap-1 hover:underline">
            Ver todas <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
        Cada planta agora mostra <b>tempo de vida no jardim</b> e um <b>histórico visual</b> para acompanhar a evolução desde o primeiro cadastro.
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPlants.slice(0, 4).map((plant: any) => (
            <PlantCard key={plant.id} plant={plant} location={locations.find((l: any) => l.id === plant.locationId)?.name} />
          ))}
        </div>
      </section>

      {/* Tasks / Reminders */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Calendar className="text-emerald-500" /> Próximas Tarefas
          </h3>
          <div className="space-y-4">
            {tasks.slice(0, 3).map((task: any) => (
              <TaskItem key={task.id} title={task.title} date={task.date} />
            ))}
          </div>
        </div>
        
        <SpecialistTips plants={filteredPlants} locations={locations} weather={weather} forecast={forecast} tasks={tasks} germinations={germinations} stock={stock} history={history} />
      </section>
    </motion.div>
  );
}

function AlertsView({ alerts, archivedAlerts, onOpenTab, onDismiss, onReactivate, onRestoreAll }: any) {
  const [showArchived, setShowArchived] = useState(false);

  const severityLabel = (severity: GardenAlert['severity']) => {
    if (severity === 'alta') return 'Alta';
    if (severity === 'media') return 'Média';
    return 'Baixa';
  };

  const severityStyles = (severity: GardenAlert['severity']) => {
    if (severity === 'alta') return 'bg-red-50 text-red-700 border-red-100';
    if (severity === 'media') return 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-blue-50 text-blue-700 border-blue-100';
  };

  const AlertCard = ({ alert, archived = false }: { alert: GardenAlert, archived?: boolean }) => (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${severityStyles(alert.severity)}`}>
              <AlertCircle className="w-3.5 h-3.5" /> {severityLabel(alert.severity)}
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{alert.category}</span>
            {archived && <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Arquivado</span>}
          </div>
          <h3 className="text-lg font-bold text-slate-900">{alert.title}</h3>
          <p className="text-slate-600 leading-relaxed">{alert.details}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {alert.targetTab && (
          <button onClick={() => onOpenTab(alert.targetTab)} className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors">
            Abrir área relacionada
          </button>
        )}
        {!archived ? (
          <button onClick={() => onDismiss(alert.id)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors">
            Arquivar alerta
          </button>
        ) : (
          <button onClick={() => onReactivate(alert.id)} className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors">
            Reativar alerta
          </button>
        )}
      </div>
    </div>
  );

  return (
    <motion.div
      key="alerts"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><AlertCircle className="text-amber-500" /> Central de Alertas</h2>
          <p className="text-slate-500 mt-1">Aqui você vê por que cada alerta apareceu e pode abrir a área correta do app ou arquivar o aviso.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowArchived(prev => !prev)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors">
            {showArchived ? 'Ocultar arquivados' : `Ver arquivados (${archivedAlerts.length})`}
          </button>
          <button onClick={onRestoreAll} className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors">
            Restaurar arquivados
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="text-sm text-slate-500">Alertas ativos</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{alerts.length}</div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="text-sm text-slate-500">Alta prioridade</div>
          <div className="text-3xl font-bold text-red-600 mt-2">{alerts.filter((alert: GardenAlert) => alert.severity === 'alta').length}</div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="text-sm text-slate-500">Arquivados</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{archivedAlerts.length}</div>
        </div>
      </div>

      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-emerald-100 p-8 shadow-sm text-center text-emerald-700 font-medium">
            Nenhum alerta ativo. Seu jardim está em dia agora.
          </div>
        ) : (
          alerts.map((alert: GardenAlert) => <div key={alert.id}><AlertCard alert={alert} /></div>)
        )}
      </div>

      {showArchived && (
        <section className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Alertas arquivados</h3>
            <p className="text-slate-500 text-sm mt-1">Arquive alertas para limpar a lista. Você pode reativá-los quando quiser.</p>
          </div>
          {archivedAlerts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 text-slate-500">Nenhum alerta arquivado.</div>
          ) : (
            archivedAlerts.map((alert: GardenAlert) => <div key={alert.id}><AlertCard alert={alert} archived /></div>)
          )}
        </section>
      )}
    </motion.div>
  );
}

function PlantsView({ filteredPlants, locations, onWater, onUpdate, onRepot, onDelete, onAdd }: any) {
  return (
    <motion.div 
      key="plants"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPlants.map((plant: any) => (
          <PlantCard 
            key={plant.id} 
            plant={plant} 
            location={locations.find((l: any) => l.id === plant.locationId)?.name} 
            locations={locations}
            onWater={onWater}
            onUpdate={onUpdate}
            onRepot={onRepot}
            onDelete={onDelete}
          />
        ))}
        <button onClick={onAdd} className="aspect-[4/5] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-emerald-500 hover:text-emerald-500 transition-all group">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
            <Plus />
          </div>
          <span className="font-semibold">Adicionar Planta</span>
        </button>
      </div>
    </motion.div>
  );
}

function PlacesView({ locations, plants, onSaveLocation, onDeleteLocation, addToHistory }: { locations: Location[], plants: Plant[], onSaveLocation: (location: Location) => void, onDeleteLocation: (id: string) => void, addToHistory: (item: Omit<HistoryItem, 'id' | 'date'>) => void }) {
  const [draft, setDraft] = useState<Location>({
    id: '',
    name: '',
    light: 'Meia Sombra',
    exposure: 'Interno',
    covered: true,
    receivesRain: false,
    sunPeriod: 'Parcial',
    notes: '',
    image: ''
  });
  const [lightScanImage, setLightScanImage] = useState<string | null>(null);
  const [lightAnalyzing, setLightAnalyzing] = useState(false);
  const [lightResult, setLightResult] = useState<LightAnalysisResult | null>(null);
  const [lightError, setLightError] = useState<string | null>(null);

  const groupedLocations = locations.map(location => ({
    ...location,
    plants: plants.filter(plant => plant.locationId === location.id),
  }));

  const resetDraft = () => {
    setDraft({
      id: '',
      name: '',
      light: 'Meia Sombra',
      exposure: 'Interno',
      covered: true,
      receivesRain: false,
      sunPeriod: 'Parcial',
      notes: '',
      image: ''
    });
    setLightScanImage(null);
    setLightResult(null);
    setLightError(null);
  };

  const handleLightCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const result = reader.result as string;
      setLightScanImage(result);
      setLightAnalyzing(true);
      setLightError(null);
      try {
        const analysis = await analyzeLightWithAI(result);
        setLightResult(analysis);
        setDraft(prev => ({
          ...prev,
          light: analysis.level,
          sunPeriod: analysis.sunPeriod,
          notes: [prev.notes, `Leitura local: ${analysis.explanation}`, analysis.middayTip].filter(Boolean).join('\n')
        }));
        addToHistory({
          type: 'Atualização',
          title: `Medição de luz do ambiente ${draft.name || 'novo ambiente'}`,
          details: `${analysis.level} • ${analysis.sunPeriod}\n${analysis.explanation}\n${analysis.middayTip}`,
          image: result,
        });
      } catch (err) {
        console.error(err);
        setLightError(getGeminiErrorMessage(err, 'Não consegui medir a luminosidade agora. Tente outra foto do ambiente, preferencialmente ao meio-dia.'));
      } finally {
        setLightAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLocationImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setDraft(prev => ({ ...prev, image: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const saveDraft = () => {
    if (!draft.name.trim()) return;
    onSaveLocation({ ...draft, name: draft.name.trim() });
    resetDraft();
  };

  return (
    <motion.div
      key="places"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Ambientes do Jardim</h2>
        <p className="text-slate-500">Cadastre locais, ajuste cobertura, chuva e exposição solar, e mova suas plantas entre ambientes.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-lg font-bold text-slate-900">Novo ambiente</h3>
          {draft.id && (
            <button onClick={resetDraft} className="text-sm font-bold text-slate-500 hover:text-slate-700">Cancelar edição</button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Ex: Varanda coberta"
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl"
          />
          <select value={draft.light} onChange={(e) => setDraft({ ...draft, light: e.target.value })} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <option>Sol Pleno</option>
            <option>Sol Parcial</option>
            <option>Meia Sombra</option>
            <option>Sombra</option>
            <option>Luz Indireta</option>
          </select>
          <select value={draft.sunPeriod} onChange={(e) => setDraft({ ...draft, sunPeriod: e.target.value })} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <option>Dia inteiro</option>
            <option>Manhã</option>
            <option>Tarde</option>
            <option>Parcial</option>
            <option>Não recebe sol direto</option>
          </select>
          <input
            value={draft.exposure}
            onChange={(e) => setDraft({ ...draft, exposure: e.target.value })}
            placeholder="Exposição / face"
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr,220px] gap-4 items-start">
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2">Foto do ambiente</label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors">
              <Camera className="w-4 h-4" /> Adicionar foto manual
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleLocationImage} />
            </label>
            {draft.image && <img src={draft.image} alt="Ambiente" className="mt-3 h-40 w-full object-cover rounded-2xl border border-slate-200" />}
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
            <b>Ambiente visual</b><br />
            Adicione uma foto manual para comparar futuras medições de luz e mudanças no espaço.
          </div>
        </div>
        <textarea
          value={draft.notes || ''}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          placeholder="Anotações do ambiente"
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl min-h-[88px]"
        />
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 space-y-4">
          <div className="flex items-start gap-3 text-sm text-amber-900">
            <ThermometerSun className="w-5 h-5 shrink-0 text-amber-500" />
            <div>
              <div className="font-bold">Medição de luminosidade integrada ao ambiente</div>
              <p>{MIDDAY_LIGHT_GUIDE}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 transition-colors">
              <Sun className="w-4 h-4" /> Medir luz deste ambiente
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleLightCapture} />
            </label>
            {lightAnalyzing && <span className="text-sm font-medium text-emerald-700">Analisando luminosidade...</span>}
          </div>
          {lightScanImage && (
            <div className="overflow-hidden rounded-2xl border border-amber-100 bg-white">
              <img src={lightScanImage} alt="Leitura do ambiente" className="h-40 w-full object-cover" />
            </div>
          )}
          {lightResult && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-white p-4 border border-emerald-100">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Luz estimada</div>
                <div className="text-lg font-bold text-slate-900">{lightResult.level}</div>
                <div className="text-sm text-slate-500">{lightResult.sunPeriod}</div>
              </div>
              <div className="rounded-2xl bg-white p-4 border border-blue-100 text-sm text-slate-700 space-y-2">
                <p><b>Leitura:</b> {lightResult.explanation}</p>
                <p><b>Dica:</b> {lightResult.tip}</p>
              </div>
            </div>
          )}
          {lightError && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{lightError}</div>}
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={!!draft.covered} onChange={(e) => setDraft({ ...draft, covered: e.target.checked })} /> Coberto
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={!!draft.receivesRain} onChange={(e) => setDraft({ ...draft, receivesRain: e.target.checked })} /> Recebe chuva
          </label>
          <button onClick={saveDraft} className="ml-auto bg-emerald-500 text-white px-5 py-2 rounded-2xl font-bold hover:bg-emerald-600 transition-colors">
            {draft.id ? 'Salvar ambiente' : 'Adicionar ambiente'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groupedLocations.map((location) => (
          <div key={location.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{location.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{location.light} • {location.sunPeriod || 'Parcial'} • Exposição {location.exposure}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                  <span className={`px-2 py-1 rounded-full ${location.covered ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{location.covered ? 'Coberto' : 'Descoberto'}</span>
                  <span className={`px-2 py-1 rounded-full ${location.receivesRain ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{location.receivesRain ? 'Recebe chuva' : 'Sem chuva direta'}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDraft(location)} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => onDeleteLocation(location.id)} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            {location.image && <img src={location.image} alt={location.name} className="w-full h-44 object-cover rounded-2xl border border-slate-200" />}
            {location.notes && <div className="p-4 rounded-2xl bg-slate-50 text-sm text-slate-600">{location.notes}</div>}

            {location.plants.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {location.plants.map((plant) => (
                  <div key={plant.id} className="rounded-2xl border border-slate-100 overflow-hidden bg-slate-50">
                    <div className="aspect-square bg-slate-100">
                      <img
                        src={plant.image || `https://picsum.photos/seed/${plant.id}/300/300`}
                        alt={plant.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="p-3">
                      <div className="font-semibold text-sm text-slate-900 line-clamp-1">{plant.name}</div>
                      <div className="text-xs text-slate-500 line-clamp-1">{plant.species || 'Espécie não informada'}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400 text-center">
                Nenhuma planta cadastrada neste ambiente ainda.
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function SeedsView({ stock, germinations, locations, onStartGermination, onUpdateGermination, onDeleteGermination, onTransferToGarden, addToHistory }: { stock: StockItem[], germinations: Germination[], locations: Location[], onStartGermination: (g: Germination) => void, onUpdateGermination: (g: Germination) => void, onDeleteGermination: (id: string) => void, onTransferToGarden: (germinationId: string, payload?: Partial<Plant>) => void, addToHistory: (item: any) => void }) {
  const [view, setView] = useState<'list' | 'identify'>('list');

  return (
    <motion.div 
      key="seeds-view"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Sementes & Germinação</h2>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'list' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Germinação
          </button>
          <button 
            onClick={() => setView('identify')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'identify' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Identificar
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <GerminationView 
          germinations={germinations} 
          locations={locations}
          onNewPlanting={() => setView('identify')} 
          onStartGermination={onStartGermination}
          onUpdateGermination={onUpdateGermination}
          onDeleteGermination={onDeleteGermination}
          onTransferToGarden={onTransferToGarden}
        />
      ) : (
        <SeedIdentifyView 
          stock={stock} 
          onStartGermination={(g) => {
            onStartGermination(g);
            setView('list');
          }} 
          addToHistory={addToHistory} 
        />
      )}
    </motion.div>
  );
}

function GerminationView({ germinations, locations, onNewPlanting, onStartGermination, onUpdateGermination, onDeleteGermination, onTransferToGarden }: { germinations: Germination[], locations: Location[], onNewPlanting?: () => void, onStartGermination: (g: Germination) => void, onUpdateGermination: (g: Germination) => void, onDeleteGermination: (id: string) => void, onTransferToGarden: (germinationId: string, payload?: Partial<Plant>) => void }) {
  const [manualSeed, setManualSeed] = useState({ name: '', species: '', expectedDays: 7, notes: '', image: '', locationId: locations[0]?.id || '' });
  const [transferingId, setTransferingId] = useState<string | null>(null);
  const [transferDraft, setTransferDraft] = useState<Partial<Plant>>({
    locationId: locations[0]?.id || '',
    potSize: 'Copo/mini vaso',
    wateringFrequency: 'Semanal',
    substrate: '',
    drainage: '',
    filterMaterial: ''
  });

  const addManualGermination = () => {
    if (!manualSeed.name.trim()) return;
    onStartGermination(normalizeGerminationRecord({
      id: Math.random().toString(36).slice(2, 9),
      name: manualSeed.name.trim(),
      species: manualSeed.species.trim(),
      startDate: new Date().toISOString(),
      expectedDays: Number(manualSeed.expectedDays) || 7,
      status: 'Em andamento',
      notes: manualSeed.notes,
      lastWatered: new Date().toISOString(),
      germinationTechniques: 'Registro manual de germinação.',
      wateringTips: 'Mantenha o substrato levemente úmido, sem encharcar.',
      image: manualSeed.image,
      locationId: manualSeed.locationId || locations[0]?.id || ''
    }));
    setManualSeed({ name: '', species: '', expectedDays: 7, notes: '', image: '', locationId: locations[0]?.id || '' });
  };

  const handleManualSeedImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setManualSeed(prev => ({ ...prev, image: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const startTransfer = (germination: Germination) => {
    const suggestion = getSeedEnvironmentRecommendation(germination, locations);
    setTransferingId(germination.id);
    setTransferDraft({
      name: germination.name,
      species: germination.species || '',
      locationId: germination.locationId || suggestion.best?.id || locations[0]?.id || '',
      potSize: 'Copo/mini vaso',
      wateringFrequency: 'Semanal',
      substrate: '',
      drainage: '',
      filterMaterial: '',
      notes: ''
    });
  };

  const saveTransfer = () => {
    if (!transferingId) return;
    onTransferToGarden(transferingId, transferDraft);
    setTransferingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr,1fr] gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-700">Acompanhamento</h3>
            {onNewPlanting && (
              <button onClick={onNewPlanting} className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors"><Plus className="w-4 h-4" /> Novo por leitura local</button>
            )}
          </div>
          <p className="text-sm text-slate-500">Gerencie rega, evolução da germinação, local sugerido e transfira automaticamente para o jardim quando a muda estiver pronta.</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-700">Adicionar germinação manual</h3>
          <input value={manualSeed.name} onChange={(e) => setManualSeed({ ...manualSeed, name: e.target.value })} placeholder="Nome da semente" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <input value={manualSeed.species} onChange={(e) => setManualSeed({ ...manualSeed, species: e.target.value })} placeholder="Espécie" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl" />
            <input type="number" value={manualSeed.expectedDays} onChange={(e) => setManualSeed({ ...manualSeed, expectedDays: Number(e.target.value) })} placeholder="Dias" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl" />
          </div>
          <select value={manualSeed.locationId} onChange={(e) => setManualSeed({ ...manualSeed, locationId: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl">
            {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
          <textarea value={manualSeed.notes} onChange={(e) => setManualSeed({ ...manualSeed, notes: e.target.value })} placeholder="Técnicas, lembretes ou observações" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl min-h-[88px]" />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors"><Camera className="w-4 h-4" /> Adicionar foto manual<input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleManualSeedImage} /></label>
          {manualSeed.image && <img src={manualSeed.image} alt="Germinação manual" className="w-full h-40 object-cover rounded-2xl border border-slate-200" />}
          <button onClick={addManualGermination} className="w-full bg-emerald-500 text-white py-3 rounded-2xl font-bold hover:bg-emerald-600 transition-colors">Salvar germinação manual</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {germinations.map((g: any) => {
          const daysElapsed = Math.max(0, Math.floor((Date.now() - new Date(g.startDate).getTime()) / 86400000));
          const progress = Math.min(100, Math.round((daysElapsed / Math.max(g.expectedDays, 1)) * 100));
          const canTransfer = g.status === 'Sucesso' || (g.status === 'Em andamento' && daysElapsed >= Math.max(g.expectedDays - 1, 1));
          const recommendation = getSeedEnvironmentRecommendation(g, locations);
          const currentLocation = locations.find(location => location.id === g.locationId);

          return (
            <div key={g.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-bold text-lg">{g.name}</h3>
                  <p className="text-sm text-slate-500 italic">{g.species || 'Espécie não informada'}</p>
                </div>
                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${g.status === 'Em andamento' ? 'bg-blue-100 text-blue-600' : g.status === 'Sucesso' ? 'bg-emerald-100 text-emerald-600' : g.status === 'Transferida' ? 'bg-purple-100 text-purple-600' : 'bg-red-100 text-red-600'}`}>{g.status}</span>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between"><span>Início:</span> <b>{new Date(g.startDate).toLocaleDateString()}</b></div>
                <div className="flex justify-between"><span>Expectativa:</span> <b>{g.expectedDays} dias</b></div>
                <div className="flex justify-between"><span>Passaram:</span> <b>{daysElapsed} dias</b></div>
                <div className="flex justify-between"><span>Ambiente:</span> <b>{currentLocation?.name || '-'}</b></div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Progresso</span><span>{progress}%</span></div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} /></div>
              </div>

              {g.image && <img src={g.image} alt={g.name} className="w-full h-40 object-cover rounded-2xl border border-slate-200" />}

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 space-y-1">
                <div><b>Melhor ambiente sugerido:</b> {recommendation.best?.name || '-'} • {recommendation.best?.label || '-'} ({recommendation.best?.score || 0}%)</div>
                <div>{recommendation.best?.reason || 'Cadastre ambientes para receber uma recomendação local.'}</div>
                {g.locationId && recommendation.current && <div><b>Compatibilidade atual:</b> {recommendation.current.label} ({recommendation.current.score}%)</div>}
                {recommendation.best?.id && recommendation.best.id !== g.locationId && (
                  <button onClick={() => onUpdateGermination({ ...g, locationId: recommendation.best?.id })} className="mt-2 inline-flex rounded-xl bg-white px-3 py-2 font-bold text-blue-700 hover:bg-blue-100">Aplicar ambiente sugerido</button>
                )}
              </div>

              {g.germinationTechniques && <div className="p-4 rounded-2xl bg-purple-50 text-purple-900 text-sm border border-purple-100"><b>Técnicas de germinação:</b><br />{g.germinationTechniques}</div>}
              {g.plantingInstructions && <div className="p-4 rounded-2xl bg-slate-50 text-slate-700 text-sm"><b>Como plantar:</b><br />{g.plantingInstructions}</div>}
              {g.wateringTips && <div className="p-4 rounded-2xl bg-blue-50 text-blue-800 text-sm border border-blue-100"><b>Rega ideal:</b><br />{g.wateringTips}</div>}
              {g.notes && <div className="p-4 rounded-2xl bg-amber-50 text-amber-900 text-sm border border-amber-100 whitespace-pre-line">{g.notes}</div>}
              {g.hydratedWithWarmWater && <div className="flex items-center gap-2 text-xs font-bold text-amber-700"><Droplets className="w-3 h-3" /> Hidratação com água morna já realizada</div>}
              {g.transferredPlantId && <div className="text-xs font-bold text-purple-700">Já transferida para o jardim.</div>}

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onUpdateGermination({ ...g, lastWatered: new Date().toISOString() })} className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm hover:bg-blue-100">Regar</button>
                <button onClick={() => onUpdateGermination({ ...g, status: 'Sucesso' })} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm hover:bg-emerald-100">Marcar sucesso</button>
                <button onClick={() => onUpdateGermination({ ...g, status: 'Falha' })} className="px-3 py-2 rounded-xl bg-red-50 text-red-700 font-bold text-sm hover:bg-red-100">Marcar falha</button>
                <button onClick={() => onDeleteGermination(g.id)} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200">Excluir</button>
              </div>

              {canTransfer && !g.transferredPlantId && <button onClick={() => startTransfer(g)} className="w-full px-4 py-3 rounded-2xl bg-purple-600 text-white font-bold hover:bg-purple-700">Transferir automaticamente para o jardim</button>}

              {transferingId === g.id && (
                <div className="mt-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-900">Criar planta no jardim</h4>
                  <input value={transferDraft.name || ''} onChange={(e) => setTransferDraft({ ...transferDraft, name: e.target.value })} placeholder="Nome da muda" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl" />
                  <div className="grid grid-cols-2 gap-3">
                    <input value={transferDraft.species || ''} onChange={(e) => setTransferDraft({ ...transferDraft, species: e.target.value })} placeholder="Espécie" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl" />
                    <select value={transferDraft.locationId || ''} onChange={(e) => setTransferDraft({ ...transferDraft, locationId: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl">{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={transferDraft.potSize || ''} onChange={(e) => setTransferDraft({ ...transferDraft, potSize: e.target.value })} placeholder="Tamanho do vaso" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl" />
                    <select value={transferDraft.wateringFrequency || 'Semanal'} onChange={(e) => setTransferDraft({ ...transferDraft, wateringFrequency: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"><option>Diária</option><option>Semanal</option><option>Quinzenal</option><option>Mensal</option></select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={transferDraft.substrate || ''} onChange={(e) => setTransferDraft({ ...transferDraft, substrate: e.target.value })} placeholder="Substrato" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl" />
                    <input value={transferDraft.drainage || ''} onChange={(e) => setTransferDraft({ ...transferDraft, drainage: e.target.value })} placeholder="Drenagem" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl" />
                  </div>
                  <textarea value={transferDraft.notes || ''} onChange={(e) => setTransferDraft({ ...transferDraft, notes: e.target.value })} placeholder="Observações extras da muda" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl min-h-[72px]" />
                  <div className="flex gap-2">
                    <button onClick={saveTransfer} className="flex-1 px-4 py-3 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600">Criar planta</button>
                    <button onClick={() => setTransferingId(null)} className="px-4 py-3 rounded-2xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {germinations.length === 0 && (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Nenhuma germinação ativa.</p>
            <button onClick={onNewPlanting} className="mt-4 text-emerald-600 font-bold hover:underline">Começar um novo plantio agora</button>
          </div>
        )}
      </div>
    </div>
  );
}

function StockView({ stock, setStock, addToHistory, locations }: { stock: StockItem[], setStock: React.Dispatch<React.SetStateAction<StockItem[]>>, addToHistory: (item: Omit<HistoryItem, 'id' | 'date'>) => void, locations: Location[] }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAiForm, setShowAiForm] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<any>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Partial<StockItem>>({ name: '', quantity: 0, unit: 'kg', minQuantity: 0, category: 'Substratos & Solos', usageTags: [], notes: '', image: '', locationId: locations[0]?.id || '' });

  const categories = [
    'Substratos & Solos',
    'Fertilizantes & Adubos',
    'Vasos & Recipientes',
    'Ferramentas',
    'Sementes & Mudas',
    'Defensivos & Pragas',
    'Outros'
  ];

  const units = ['kg', 'g', 'un', 'L', 'mL', '-'];

  const resetNewItem = () => setNewItem({ name: '', quantity: 0, unit: 'kg', minQuantity: 0, category: 'Substratos & Solos', usageTags: [], notes: '', image: '', locationId: locations[0]?.id || '' });

  const openNewItemForm = () => {
    setEditingItemId(null);
    resetNewItem();
    setAiPreview(null);
    setAiError(null);
    setShowAiForm(false);
    setShowAddForm(true);
  };

  const openEditItemForm = (item: StockItem) => {
    setEditingItemId(item.id);
    setNewItem(normalizeStockRecord(item));
    setAiPreview(null);
    setAiError(null);
    setShowAiForm(false);
    setShowAddForm(true);
  };

  const closeForms = () => {
    setShowAddForm(false);
    setShowAiForm(false);
    setEditingItemId(null);
    setAiPreview(null);
    setAiError(null);
    resetNewItem();
  };

  useEffect(() => {
    const patch = buildStockAutofillPatch(newItem.name || '', newItem);
    if (!Object.keys(patch).length) return;
    setNewItem(prev => ({ ...prev, ...patch }));
  }, [newItem.name]);

  const toggleUsageTag = (tag: string) => {
    setNewItem(prev => {
      const current = inferStockUsageTags(prev as StockItem);
      const next = current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag];
      return { ...prev, usageTags: next };
    });
  };

  const handleAddItem = () => {
    if (!newItem.name?.trim()) return;
    const item: StockItem = normalizeStockRecord({
      ...newItem,
      id: editingItemId || newItem.id,
      name: normalizeChoice(newItem.name),
      locationId: newItem.locationId || locations[0]?.id || ''
    });
    if (editingItemId) {
      setStock(prev => prev.map(i => i.id === editingItemId ? item : i));
      addToHistory({
        type: 'Atualização',
        title: `Item de estoque atualizado: ${item.name}`,
        details: `Categoria: ${item.category}. Local: ${locations.find(location => location.id === item.locationId)?.name || '-'}.
Usos no app: ${item.usageTags?.join(', ') || '-'}.`
      });
    } else {
      setStock(prev => [...prev, item]);
      addToHistory({
        type: 'Atualização',
        title: `Item de estoque cadastrado: ${item.name}`,
        details: `Categoria: ${item.category}. Local: ${locations.find(location => location.id === item.locationId)?.name || '-'}.
Usos no app: ${item.usageTags?.join(', ') || '-'}. Quantidade inicial: ${item.quantity} ${item.unit}.`
      });
    }
    closeForms();
  };

  const deleteItem = (id: string) => {
    setStock(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setStock(prev => prev.map(i => i.id === id ? normalizeStockRecord({ ...i, quantity: Math.max(0, i.quantity + delta) }) : i));
  };

  const applySuggestedLocation = (item: StockItem) => {
    const suggestion = getStockEnvironmentRecommendation(item, locations);
    if (!suggestion.best?.id) return;
    setStock(prev => prev.map(entry => entry.id === item.id ? normalizeStockRecord({ ...entry, locationId: suggestion.best?.id }) : entry));
  };

  const handleManualImageSelection = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await readFileAsOptimizedDataUrl(file);
    setNewItem(prev => ({ ...prev, image: result }));
  };

  const handleImageSelection = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await readFileAsOptimizedDataUrl(file);
    setNewItem(prev => ({ ...prev, image: result }));
    identifyStockItem(result);
  };

  const identifyStockItem = async (base64Image: string) => {
    setIdentifying(true);
    setAiError(null);
    setAiPreview(null);
    try {
      const local = identifyStockLocally();
      const preview = {
        name: local.name,
        category: local.category,
        usageTags: local.usageTags,
        unit: local.unit,
        notes: local.notes,
        confidence: local.confidence
      };
      setAiPreview(preview);
      setNewItem(prev => ({ ...prev, name: preview.name, category: preview.category, unit: preview.unit, notes: preview.notes, usageTags: preview.usageTags }));
      setAiError('Usei uma leitura local básica. Se você completar o nome do item, a ficha tenta se autopreencher.');
      setShowAddForm(true);
    } finally {
      setIdentifying(false);
    }
  };

  const formSuggestion = getStockEnvironmentRecommendation({ ...newItem, locationId: newItem.locationId || '' }, locations);

  const groupedStock = categories.reduce((acc, cat) => {
    const items = stock.filter(i => i.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<string, StockItem[]>);

  return (
    <motion.div 
      key="stock"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Estoque de Insumos</h2>
          <p className="text-slate-500">Gerencie seus materiais sem alertas de nível crítico. Agora você também pode sugerir o melhor ambiente para guardar cada item e editar a ficha completa depois do cadastro.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => { setShowAiForm(prev => !prev); setAiError(null); setEditingItemId(null); if (!showAiForm) resetNewItem(); }}
            className="bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
          >
            <PackageSearch className="w-5 h-5" /> Identificar item localmente
          </button>
          <button 
            onClick={openNewItemForm}
            className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-5 h-5" /> Novo Item
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAiForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Identificação local de item do estoque</h3>
                <p className="text-slate-500 text-sm mt-1">Tire uma foto do saco, embalagem, vaso, ferramenta ou insumo. O app faz uma leitura local básica e abre a ficha para você revisar e salvar.</p>
              </div>
              {!newItem.image ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div className="text-slate-500 text-sm">Fotografe o item para sugerir nome, categoria, unidade e usos no app.</div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-500 px-5 py-3 font-bold text-white hover:bg-blue-600 transition-colors">
                    <Scan className="w-4 h-4" /> Tirar ou escolher foto
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelection} />
                  </label>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-5">
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <img src={newItem.image} alt="Item do estoque" className="h-64 w-full object-cover" />
                    </div>
                    <div className="flex gap-2">
                      <label className="flex-1 cursor-pointer rounded-xl bg-slate-100 px-4 py-3 text-center font-semibold text-slate-700 hover:bg-slate-200 transition-colors">
                        Trocar foto
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelection} />
                      </label>
                      <button onClick={() => { setNewItem(prev => ({ ...prev, image: '' })); setAiPreview(null); setAiError(null); }} className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-200 transition-colors">Limpar</button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {identifying && <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-5 text-blue-700 font-medium flex items-center gap-3"><RefreshCw className="w-5 h-5 animate-spin" /> Analisando o item localmente...</div>}
                    {aiPreview && (
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Sugestão local</div>
                            <div className="text-xl font-bold text-emerald-950 mt-1">{aiPreview.name}</div>
                          </div>
                          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">Confiança {aiPreview.confidence}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                          <span className="rounded-full bg-white px-3 py-1 text-slate-700 border border-slate-200">Categoria: {aiPreview.category}</span>
                          <span className="rounded-full bg-white px-3 py-1 text-slate-700 border border-slate-200">Unidade: {aiPreview.unit}</span>
                        </div>
                        <p className="text-sm text-emerald-900 leading-relaxed">{aiPreview.notes || '-'}</p>
                      </div>
                    )}
                    {aiError && <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm font-medium text-amber-700">{aiError}</div>}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-900">{editingItemId ? 'Editar item do estoque' : 'Novo item do estoque'}</h3>
                <button onClick={closeForms} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-semibold hover:bg-slate-200 transition-colors">Fechar</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nome do Item</label><div className="text-[11px] text-slate-500 ml-1">Ao digitar o nome, o app tenta sugerir categoria, unidade e usos no app.</div>
                  <input type="text" placeholder="Ex: Terra Vegetal" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" value={newItem.name || ''} onChange={(e) => setNewItem({...newItem, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Categoria</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" value={newItem.category || 'Substratos & Solos'} onChange={(e) => setNewItem({...newItem, category: e.target.value})}>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Ambiente / guarda</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" value={newItem.locationId || ''} onChange={(e) => setNewItem({ ...newItem, locationId: e.target.value })}>
                    <option value="">-</option>
                    {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Qtd Atual</label>
                    <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" value={newItem.quantity ?? 0} onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Unidade</label>
                    <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" value={newItem.unit || 'kg'} onChange={(e) => setNewItem({...newItem, unit: e.target.value})}>
                      {units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                    </select>
                  </div>
                </div>
                <div className="md:col-span-2 lg:col-span-3 space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Observações</label>
                  <textarea rows={3} placeholder="Para que serve, como você usa ou qualquer observação importante." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" value={newItem.notes || ''} onChange={(e) => setNewItem({...newItem, notes: e.target.value})} />
                </div>
                <div className="md:col-span-2 lg:col-span-3 space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Foto manual</label>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors">
                    <Camera className="w-4 h-4" /> Adicionar ou trocar foto
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleManualImageSelection} />
                  </label>
                  {newItem.image && <img src={newItem.image} alt={newItem.name || 'Item do estoque'} className="w-full h-40 object-cover rounded-2xl border border-slate-200" />}
                </div>
                <div className="md:col-span-2 lg:col-span-3 space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Categorias de uso no app</label>
                  <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    {STOCK_USAGE_TAGS.map(tag => {
                      const active = inferStockUsageTags(newItem as StockItem).includes(tag);
                      return (
                        <button key={tag} type="button" onClick={() => toggleUsageTag(tag)} className={`rounded-full px-3 py-2 text-xs font-bold transition-colors border ${active ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-200 hover:text-blue-700'}`}>
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500">Você pode marcar mais de uma categoria de uso. Isso melhora as sugestões automáticas do app.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-2 text-sm text-blue-900">
                <div className="font-bold">Sugestão de ambiente para guardar esse item</div>
                <p><b>Melhor local:</b> {formSuggestion.best?.name || '-'} • {formSuggestion.best?.label || '-'} ({formSuggestion.best?.score || 0}%)</p>
                <p>{formSuggestion.best?.reason || 'Cadastre alguns ambientes para receber uma sugestão automática.'}</p>
                {newItem.locationId && formSuggestion.current && <p><b>Compatibilidade do local atual:</b> {formSuggestion.current.name} • {formSuggestion.current.label} ({formSuggestion.current.score}%)</p>}
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={closeForms} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleAddItem} className="px-8 py-2 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/10">{editingItemId ? 'Salvar alterações' : 'Salvar Item'}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {Object.entries(groupedStock).map(([category, items]) => (
          <div key={category} className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 ml-2"><div className="w-2 h-2 rounded-full bg-emerald-500" />{category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => {
                const recommendation = getStockEnvironmentRecommendation(item, locations);
                const currentLocation = locations.find(location => location.id === item.locationId);
                return (
                <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group space-y-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {item.image ? (
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 shrink-0"><img src={item.image} alt={item.name} className="w-full h-full object-cover" /></div>
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 shrink-0 flex items-center justify-center text-slate-400"><Package className="w-6 h-6" /></div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 truncate">{item.name}</h4>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">{item.category}</p>
                        {inferStockUsageTags(item).length > 0 && <div className="mt-2 flex flex-wrap gap-1">{inferStockUsageTags(item).map(tag => <span key={tag} className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 border border-blue-100">{tag}</span>)}</div>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEditItemForm(item)} className="text-slate-300 hover:text-emerald-500 transition-colors"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-2xl font-black text-slate-900">{item.quantity} <span className="text-sm font-bold text-slate-400">{item.unit}</span></div>
                      <div className="text-[10px] font-bold uppercase mt-1 text-emerald-500">Disponível para uso</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors">-</button>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors">+</button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 space-y-1">
                    <div><b>Local atual:</b> {currentLocation?.name || '-'}</div>
                    <div><b>Melhor local sugerido:</b> {recommendation.best?.name || '-'} • {recommendation.best?.label || '-'} ({recommendation.best?.score || 0}%)</div>
                    <div>{recommendation.best?.reason || 'Cadastre ambientes para receber recomendações locais.'}</div>
                    {item.locationId && recommendation.current && <div><b>Compatibilidade atual:</b> {recommendation.current.label} ({recommendation.current.score}%)</div>}
                    {recommendation.best?.id && recommendation.best.id !== item.locationId && <button onClick={() => applySuggestedLocation(item)} className="mt-2 inline-flex rounded-xl bg-blue-50 px-3 py-2 font-bold text-blue-700 hover:bg-blue-100">Aplicar ambiente sugerido</button>}
                  </div>

                  {item.notes && item.notes !== '-' && <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs leading-relaxed text-slate-600 whitespace-pre-line">{item.notes}</div>}
                </div>
              )})}
            </div>
          </div>
        ))}
        {stock.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Seu estoque está vazio.</p>
            <button onClick={openNewItemForm} className="mt-4 text-emerald-600 font-bold hover:underline">Adicionar primeiro item</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function LogsView({ logs, plants }: any) {
  return (
    <motion.div 
      key="logs"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-bold">Histórico de Atividades</h2>
      <div className="space-y-4">
        {logs.map((log: any) => (
          <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex gap-4 items-start">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold">{log.action} - {plants.find((p: any) => p.id === log.plantId)?.name}</div>
              <div className="text-xs text-slate-400 mb-1">{new Date(log.date).toLocaleString()}</div>
              <p className="text-sm text-slate-600">{log.notes}</p>
            </div>
          </div>
        ))}
        {logs.length === 0 && <p className="text-slate-400 italic">Nenhum registro encontrado.</p>}
      </div>
    </motion.div>
  );
}

function GuideView({ catalog }: any) {
  return (
    <motion.div 
      key="guide"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-bold">Guia de Cultivo</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {catalog.map((item: any, idx: number) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex gap-6">
            <div className="w-24 h-24 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
              <Leaf className="w-10 h-10" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">{item.name}</h3>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="text-slate-400">Luz:</div> <div className="font-medium">{item.light}</div>
                <div className="text-slate-400">Rega:</div> <div className="font-medium">{item.water}</div>
                <div className="text-slate-400">Solo:</div> <div className="font-medium">{item.substrate}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ReportsView({ data }: any) {
  const generateReport = () => {
    const report = `# Relatório Atena Garden - ${new Date().toLocaleDateString()}\n\n` +
      `Total de Plantas: ${data.plants.length}\n` +
      `Alertas Ativos: ${data.plants.filter((p: any) => p.status === 'Problema').length}\n` +
      `Itens em Germinação: ${data.germinations.length}\n`;
    
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_jardim_${new Date().getTime()}.md`;
    a.click();
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atena_garden_backup_${new Date().getTime()}.json`;
    a.click();
  };

  return (
    <motion.div 
      key="reports"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <h2 className="text-2xl font-bold">Relatórios e Backup</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
          <FileText className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h3 className="font-bold text-xl mb-2">Relatório de Status</h3>
          <p className="text-slate-500 mb-6">Gere um resumo em Markdown com o estado atual do seu jardim.</p>
          <button onClick={generateReport} className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
            <Download className="w-5 h-5" /> Gerar Relatório
          </button>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
          <History className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h3 className="font-bold text-xl mb-2">Backup de Dados</h3>
          <p className="text-slate-500 mb-6">Exporte todos os seus dados em formato JSON para segurança.</p>
          <button onClick={exportBackup} className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
            <Upload className="w-5 h-5" /> Exportar JSON
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function LightMeterView() {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        analyzeLight(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeLight = async (base64Image: string) => {
    setAnalyzing(true);
    setError(null);
    try {
      const data = await analyzeLightWithAI(base64Image);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError("Erro ao analisar a imagem. Verifique sua conexão e tente novamente.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <motion.div 
      key="light-meter"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto space-y-8"
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Medidor de Luz local</h2>
        <p className="text-slate-500">Tire uma foto do local da sua planta para saber se a iluminação é adequada.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
        {!image ? (
          <div className="aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-slate-400">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
              <Camera className="w-8 h-8" />
            </div>
            <label className="cursor-pointer bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20">
              Tirar Foto
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
            </label>
            <p className="text-xs">Sua foto será analisada pela Inteligência Artificial do Google.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="aspect-video rounded-2xl overflow-hidden relative border border-slate-200">
              <img src={image} alt="Local capturado" className="w-full h-full object-cover" />
              {analyzing && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                  <span className="font-bold">Analisando luminosidade...</span>
                </div>
              )}
            </div>

            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold mb-2 uppercase tracking-wider text-xs">
                    <Sun className="w-4 h-4" /> Resultado da Análise
                  </div>
                  <div className="text-2xl font-bold text-emerald-900 mb-2">{result.level}</div>
                  <p className="text-sm font-semibold text-emerald-700 mb-2">{result.sunPeriod}</p>
                  <p className="text-emerald-800 leading-relaxed">{result.explanation}</p>
                </div>

                <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl">
                  <div className="flex items-center gap-2 text-blue-600 font-bold mb-2 uppercase tracking-wider text-xs">
                    <Sprout className="w-4 h-4" /> Dica de Cultivo
                  </div>
                  <p className="text-blue-800 leading-relaxed">{result.tip}</p>
                </div>

                <button 
                  onClick={() => { setImage(null); setResult(null); }}
                  className="w-full py-4 text-slate-500 font-semibold hover:text-emerald-600 transition-colors"
                >
                  Tirar outra foto
                </button>
              </motion.div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">
                {error}
                <button onClick={() => setImage(null)} className="block mt-2 underline">Tentar novamente</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex gap-4">
        <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
        <div className="text-sm text-amber-900 leading-relaxed">
          <b>Dica:</b> Faça a medição preferencialmente ao meio-dia, sem flash, para capturar melhor o pico de luminosidade do ambiente.
        </div>
      </div>
    </motion.div>
  );
}

function HistoryView({ history }: { history: HistoryItem[] }) {
  return (
    <motion.div 
      key="data-history"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Histórico de Dados IA</h2>
        <div className="text-sm text-slate-500 font-medium">
          {history.length} registros confirmados
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {history.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex gap-6 items-start">
            {item.image && (
              <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-slate-100">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${
                    item.type === 'Identificação' ? 'bg-emerald-100 text-emerald-600' :
                    item.type === 'Semente' ? 'bg-blue-100 text-blue-600' :
                    item.type === 'Rega' ? 'bg-cyan-100 text-cyan-600' :
                    item.type === 'Replantio' ? 'bg-amber-100 text-amber-600' :
                    item.type === 'Atualização' ? 'bg-slate-100 text-slate-600' :
                    'bg-rose-100 text-rose-600'
                  }`}>
                    {item.type === 'Identificação' && <Scan className="w-3.5 h-3.5" />}
                    {item.type === 'Semente' && <PackageSearch className="w-3.5 h-3.5" />}
                    {item.type === 'Rega' && <Water className="w-3.5 h-3.5" />}
                    {item.type === 'Replantio' && <RefreshCw className="w-3.5 h-3.5" />}
                    {item.type === 'Atualização' && <Edit3 className="w-3.5 h-3.5" />}
                    {item.type === 'Diagnóstico' && <Bug className="w-3.5 h-3.5" />}
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                    item.type === 'Identificação' ? 'bg-emerald-100 text-emerald-600' :
                    item.type === 'Semente' ? 'bg-blue-100 text-blue-600' :
                    item.type === 'Rega' ? 'bg-cyan-100 text-cyan-600' :
                    item.type === 'Replantio' ? 'bg-amber-100 text-amber-600' :
                    item.type === 'Atualização' ? 'bg-slate-100 text-slate-600' :
                    'bg-rose-100 text-rose-600'
                  }`}>
                    {item.type}
                  </span>
                  <span className="text-xs text-slate-400">{new Date(item.date).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold uppercase">
                  <CheckCircle2 className="w-3 h-3" /> Confirmado
                </div>
              </div>
              <h3 className="font-bold text-lg text-slate-900">{item.title}</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{item.details}</p>
            </div>
          </div>
        ))}
        {history.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Nenhum dado confirmado ainda.</p>
            <p className="text-slate-400 text-sm">Identificações e diagnósticos confirmados aparecerão aqui.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function DiagnoseView({ addToHistory, setToast }: any) {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleCapture = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        analyzeHealth(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeHealth = async (base64Image: string) => {
    setAnalyzing(true);
    setError(null);
    setConfirmed(false);
    try {
      setResult(diagnosePlantLocally());
      setError('O diagnóstico por imagem agora usa análise local básica. Revise o resultado antes de agir.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirm = () => {
    if (!result) return;
    addToHistory({
      type: 'Diagnóstico',
      title: result.problem,
      details: `Gravidade: ${result.severity}\nCausa: ${result.cause}\nTratamento: ${result.treatment}`,
      image: image || undefined
    });
    setConfirmed(true);
    setToast("Diagnóstico confirmado e salvo no histórico!");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <motion.div 
      key="diagnose"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Diagnóstico de Saúde</h2>
        <p className="text-slate-500">Faça uma triagem local básica tirando uma foto da parte afetada da planta. O resultado serve como apoio inicial, não como diagnóstico definitivo.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
        {!image ? (
          <div className="aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-slate-400">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-rose-500">
              <Bug className="w-8 h-8" />
            </div>
            <label className="cursor-pointer bg-rose-500 text-white px-8 py-4 rounded-2xl font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20 flex items-center gap-2">
              <Camera className="w-5 h-5" /> Analisar Saúde
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
            </label>
            <p className="text-xs text-center px-4">Foque bem na parte da folha ou caule que parece doente.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="aspect-video rounded-2xl overflow-hidden relative border border-slate-200 shadow-inner">
              <img src={image} alt="Planta para diagnóstico" className="w-full h-full object-cover" />
              {analyzing && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                  <span className="font-bold">Analisando sintomas...</span>
                </div>
              )}
            </div>

            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className={`p-6 rounded-2xl border ${
                  result.severity === 'Alta' ? 'bg-red-50 border-red-100' : 
                  result.severity === 'Média' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs">
                      <Bug className="w-4 h-4" /> Diagnóstico Encontrado
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                      result.severity === 'Alta' ? 'bg-red-500 text-white' : 
                      result.severity === 'Média' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                    }`}>
                      Gravidade: {result.severity}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mb-2">{result.problem}</div>
                  <div className="text-sm font-medium text-slate-600 mb-4">Causa: {result.cause}</div>
                </div>

                <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold mb-4 uppercase tracking-wider text-xs">
                    <CheckCircle2 className="w-4 h-4" /> Tratamento Recomendado
                  </div>
                  <p className="text-emerald-900 leading-relaxed whitespace-pre-wrap">{result.treatment}</p>
                </div>

                <div className="flex gap-3">
                  {!confirmed ? (
                    <button 
                      onClick={handleConfirm}
                      className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" /> Confirmar Diagnóstico
                    </button>
                  ) : (
                    <div className="flex-1 py-4 bg-emerald-100 text-emerald-700 rounded-2xl font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5" /> Confirmado
                    </div>
                  )}
                  <button 
                    onClick={() => { setImage(null); setResult(null); setConfirmed(false); }}
                    className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    Novo Diagnóstico
                  </button>
                </div>
              </motion.div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">
                {error}
                <button onClick={() => setImage(null)} className="block mt-2 underline">Tentar novamente</button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function IdentifyPlantView({ addPlant, locations, stock, addToHistory, onApplyLightToLocation }: any) {
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [image, setImage] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [plantData, setPlantData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState(locations[0]?.id || '');
  const [confirmed, setConfirmed] = useState(false);
  const [stockMessage, setStockMessage] = useState<string | null>(null);
  const [lightMeasurement, setLightMeasurement] = useState<LightAnalysisResult | null>(null);
  const [applyingLight, setApplyingLight] = useState(false);
  const [manualPlant, setManualPlant] = useState<Partial<Plant>>({
    name: '',
    species: UNKNOWN_OPTION,
    locationId: locations[0]?.id || '',
    status: 'Saudável',
    wateringFrequency: 'Semanal',
    notes: UNKNOWN_OPTION,
    potSize: UNKNOWN_OPTION,
    substrate: UNKNOWN_OPTION,
    drainage: UNKNOWN_OPTION,
    filterMaterial: UNKNOWN_OPTION,
    substrateMix: UNKNOWN_OPTION,
    drainageLayer: UNKNOWN_OPTION,
    image: ''
  });

  const matchSelectOption = (value: string | undefined, options: string[]) => {
    const normalized = normalizeChoice(value);
    return options.includes(normalized) ? normalized : UNKNOWN_OPTION;
  };

  const patchPlantData = (partial: any) => {
    setPlantData((prev: any) => ({ ...(prev || {}), ...partial }));
  };

  const aiStockBundle = useMemo(() => buildStockRecommendationBundle(stock, plantData || {}), [stock, plantData]);
  const aiStockSuggestion = useMemo(() => {
    if (!plantData) return '';
    return [plantData.stockSuggestions && plantData.stockSuggestions !== UNKNOWN_OPTION ? plantData.stockSuggestions : '', aiStockBundle.summary].filter(Boolean).join(' ');
  }, [plantData, aiStockBundle]);

  const manualStockBundle = useMemo(() => buildStockRecommendationBundle(stock, manualPlant), [stock, manualPlant]);
  const manualStockSuggestion = manualStockBundle.summary;

  const applyAiStockSuggestion = () => {
    if (!plantData) return;
    const patch = aiStockBundle.patch;
    if (!Object.keys(patch).length) {
      setStockMessage('A ficha já está alinhada com o estoque ou não há itens suficientes para sugerir algo novo.');
      return;
    }
    patchPlantData(patch);
    setStockMessage('Sugestões do estoque aplicadas ao cadastro por IA.');
  };

  const applyManualStockSuggestion = () => {
    const patch = manualStockBundle.patch;
    if (!Object.keys(patch).length) {
      setStockMessage('A ficha manual já está alinhada com o estoque ou não há itens suficientes para sugerir algo novo.');
      return;
    }
    setManualPlant(prev => ({ ...prev, ...patch }));
    setStockMessage('Sugestões do estoque aplicadas aos campos técnicos em aberto.');
  };

  const resetAiState = () => {
    setImage(null);
    setPlantData(null);
    setConfirmed(false);
    setError(null);
    setStockMessage(null);
    setLightMeasurement(null);
  };

  useEffect(() => {
    setStockMessage(null);
  }, [mode]);

  useEffect(() => {
    const profile = findPlantProfileByName(manualPlant.name);
    if (!profile) return;
    setManualPlant(prev => {
      const patch = buildPlantAutofillPatch(profile, prev);
      if (!Object.keys(patch).length) return prev;
      return { ...prev, ...patch };
    });
  }, [manualPlant.name]);

  const handleCapture = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await readFileAsOptimizedDataUrl(file);
    setImage(result);
    identifyPlant(result);
  };

  const handleManualImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await readFileAsOptimizedDataUrl(file);
    setManualPlant(prev => ({ ...prev, image: result }));
  };

  const identifyPlant = async (base64Image: string) => {
    setIdentifying(true);
    setError(null);
    setConfirmed(false);
    try {
      const lightAnalysis = await analyzeLightWithAI(base64Image);
      setLightMeasurement(lightAnalysis);
      setPlantData(identifyPlantLocally(lightAnalysis, stock));
      setError('A leitura local por foto montou uma ficha inicial. Revise manualmente antes de salvar.');
    } finally {
      setIdentifying(false);
    }
  };

  const handleApplyDetectedLight = async () => {
    if (!lightMeasurement) {
      setStockMessage('Ainda não há leitura de luminosidade para aplicar.');
      return;
    }
    if (!selectedLocation) {
      setStockMessage('Escolha um ambiente antes de aplicar a medição de luz.');
      return;
    }
    setApplyingLight(true);
    try {
      await onApplyLightToLocation?.(selectedLocation, lightMeasurement);
      setStockMessage(`Leitura de luminosidade aplicada ao ambiente ${locations.find((l: any) => l.id === selectedLocation)?.name || ''}.`);
    } finally {
      setApplyingLight(false);
    }
  };

  const handleSave = () => {
    if (!plantData) return;

    const newPlant: Plant = {
      id: Math.random().toString(36).substr(2, 9),
      name: normalizeChoice(plantData.name),
      species: normalizeChoice(plantData.species),
      locationId: selectedLocation,
      status: (plantData.status || 'Saudável') as Plant['status'],
      wateringFrequency: plantData.wateringFrequency || 'Semanal',
      notes: [normalizeChoice(plantData.notes), aiStockSuggestion].filter(Boolean).join('\n\n'),
      image: image || undefined,
      lastWatered: new Date().toISOString(),
      lastRepotted: '',
      potSize: normalizeChoice(plantData.potSize),
      substrateMix: normalizeChoice(plantData.substrateMix),
      drainageLayer: normalizeChoice(plantData.drainageLayer),
      substrate: normalizeChoice(plantData.substrate),
      drainage: normalizeChoice(plantData.drainage),
      filterMaterial: normalizeChoice(plantData.filterMaterial),
      isFavorite: false,
      createdAt: new Date().toISOString(),
      photoHistory: image ? [createPhotoEntry(image, 'Registro inicial por identificação', 'Identificação')] : []
    };

    addPlant(normalizePlantRecord(newPlant));
    addToHistory({
      type: 'Identificação',
      title: newPlant.name,
      details: `Espécie: ${newPlant.species}
Local: ${locations.find((l: any) => l.id === selectedLocation)?.name}
Substrato: ${newPlant.substrateMix !== UNKNOWN_OPTION ? newPlant.substrateMix : newPlant.substrate}
Drenagem: ${newPlant.drainageLayer !== UNKNOWN_OPTION ? newPlant.drainageLayer : newPlant.drainage}`,
      image: image || undefined
    });
    setConfirmed(true);
  };

  const handleManualSave = () => {
    if (!manualPlant.name?.trim()) {
      alert('Digite pelo menos o nome da planta.');
      return;
    }

    const newPlant: Plant = {
      id: Math.random().toString(36).substr(2, 9),
      name: manualPlant.name.trim(),
      species: normalizeChoice(manualPlant.species),
      locationId: manualPlant.locationId || locations[0]?.id || '1',
      status: (manualPlant.status as Plant['status']) || 'Saudável',
      wateringFrequency: manualPlant.wateringFrequency || 'Semanal',
      notes: [normalizeChoice(manualPlant.notes), manualStockSuggestion].filter(Boolean).join('\n\n'),
      image: manualPlant.image,
      lastWatered: manualPlant.lastWatered || '',
      lastRepotted: manualPlant.lastRepotted || '',
      potSize: normalizeChoice(manualPlant.potSize),
      substrate: normalizeChoice(manualPlant.substrate),
      drainage: normalizeChoice(manualPlant.drainage),
      filterMaterial: normalizeChoice(manualPlant.filterMaterial),
      substrateMix: normalizeChoice(manualPlant.substrateMix),
      drainageLayer: normalizeChoice(manualPlant.drainageLayer),
      isFavorite: false,
      createdAt: new Date().toISOString(),
      photoHistory: manualPlant.image ? [createPhotoEntry(manualPlant.image, 'Registro inicial manual', 'Cadastro manual')] : []
    };

    addPlant(normalizePlantRecord(newPlant));
    addToHistory({
      type: 'Atualização',
      title: `Cadastro manual: ${newPlant.name}`,
      details: `Planta adicionada manualmente em ${locations.find((l: any) => l.id === newPlant.locationId)?.name || 'Local não definido'}`,
      image: newPlant.image,
    });
  };

  return (
    <motion.div
      key="identify"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-8"
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Adicionar Planta</h2>
        <p className="text-slate-500">Use leitura local por foto ou preencha manualmente o cadastro completo da planta.</p>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-fit mx-auto">
        <button
          onClick={() => setMode('ai')}
          className={`px-5 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'ai' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Leitura local por foto
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`px-5 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'manual' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Cadastro manual
        </button>
      </div>

      {mode === 'ai' ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
          {!image ? (
            <div className="aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-slate-400">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <Scan className="w-8 h-8" />
              </div>
              <label className="cursor-pointer bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                <Camera className="w-5 h-5" /> Identificar Planta
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
              </label>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="aspect-video rounded-2xl overflow-hidden relative border border-slate-200 shadow-inner">
                <img src={image} alt="Planta capturada" className="w-full h-full object-cover" />
                {identifying && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-3">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                    <span className="font-bold">Identificando espécie e completando ficha...</span>
                  </div>
                )}
              </div>

              {plantData && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    A leitura local tentou preencher uma ficha inicial. Quando não souber algo, deixe <b>-</b> ou ajuste manualmente antes de salvar.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nome Identificado</label>
                      <input type="text" value={plantData.name} onChange={(e) => patchPlantData({ name: e.target.value })} className="w-full bg-transparent font-bold text-slate-900 focus:outline-none" />
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Espécie</label>
                      <input type="text" value={plantData.species} onChange={(e) => patchPlantData({ species: e.target.value })} className="w-full bg-transparent font-medium text-slate-600 italic focus:outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Onde ela vai ficar?</label>
                      <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="w-full bg-transparent font-bold text-slate-900 focus:outline-none appearance-none">
                        {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Status</label>
                      <select value={plantData.status} onChange={(e) => patchPlantData({ status: e.target.value })} className="w-full bg-transparent font-bold text-slate-900 focus:outline-none appearance-none">
                        {PLANT_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <label className="text-xs font-bold text-emerald-600 uppercase mb-1 block">Frequência de Rega</label>
                      <select value={plantData.wateringFrequency} onChange={(e) => patchPlantData({ wateringFrequency: e.target.value })} className="w-full bg-transparent font-bold text-emerald-900 focus:outline-none appearance-none">
                        {WATERING_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <label className="text-xs font-bold text-slate-400 uppercase">Tamanho do vaso</label>
                      <select value={normalizeChoice(plantData.potSize)} onChange={(e) => patchPlantData({ potSize: e.target.value })} className="w-full bg-transparent font-semibold text-slate-900 focus:outline-none appearance-none">
                        {POT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <label className="text-xs font-bold text-slate-400 uppercase">Material de filtragem</label>
                      <select value={normalizeChoice(plantData.filterMaterial)} onChange={(e) => patchPlantData({ filterMaterial: e.target.value })} className="w-full bg-transparent font-semibold text-slate-900 focus:outline-none appearance-none">
                        {FILTER_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <label className="text-xs font-bold text-slate-400 uppercase">Substrato principal</label>
                      <select value={normalizeChoice(plantData.substrate)} onChange={(e) => patchPlantData({ substrate: e.target.value })} className="w-full bg-transparent font-semibold text-slate-900 focus:outline-none appearance-none">
                        {SUBSTRATE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                      <input type="text" value={normalizeChoice(plantData.substrateMix)} onChange={(e) => patchPlantData({ substrateMix: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl" placeholder="Detalhes da mistura ou -" />
                    </div>
                    <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <label className="text-xs font-bold text-slate-400 uppercase">Drenagem</label>
                      <select value={normalizeChoice(plantData.drainage)} onChange={(e) => patchPlantData({ drainage: e.target.value })} className="w-full bg-transparent font-semibold text-slate-900 focus:outline-none appearance-none">
                        {DRAINAGE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                      <input type="text" value={normalizeChoice(plantData.drainageLayer)} onChange={(e) => patchPlantData({ drainageLayer: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl" placeholder="Detalhes da camada ou -" />
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <label className="text-xs font-bold text-blue-600 uppercase mb-1 block">Dica de Cuidado</label>
                    <textarea value={plantData.notes} onChange={(e) => patchPlantData({ notes: e.target.value })} className="w-full bg-transparent text-blue-900 focus:outline-none resize-none h-20" />
                  </div>

                  <StockSuggestionPanel
                    summary={aiStockSuggestion}
                    items={aiStockBundle.items}
                    onApply={applyAiStockSuggestion}
                    disabled={!Object.keys(aiStockBundle.patch).length}
                    message={stockMessage}
                  />

                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 space-y-4">
                    <div className="flex items-start gap-3 text-sm text-amber-900">
                      <ThermometerSun className="w-5 h-5 shrink-0 text-amber-500" />
                      <div>
                        <div className="font-bold">Leitura automática de luminosidade do scan</div>
                        <p>{lightMeasurement ? `Estimativa atual: ${lightMeasurement.level} • ${lightMeasurement.sunPeriod}. ${lightMeasurement.explanation}` : 'Ao escanear a planta, o app também tenta medir a luminosidade do local pela mesma foto.'}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white p-4 border border-amber-100 text-sm text-slate-700">
                      <b>Para melhor precisão:</b> {lightMeasurement?.middayTip || MIDDAY_LIGHT_GUIDE}
                    </div>
                    {lightMeasurement && (
                      <div className="grid gap-3 md:grid-cols-[1fr,auto] md:items-center">
                        <div className="rounded-2xl bg-white p-4 border border-emerald-100 text-sm text-slate-700 space-y-2">
                          <p><b>Luz estimada:</b> {lightMeasurement.level}</p>
                          <p><b>Período de sol:</b> {lightMeasurement.sunPeriod}</p>
                          <p><b>Dica:</b> {lightMeasurement.tip}</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleApplyDetectedLight}
                          disabled={applyingLight || !selectedLocation}
                          className="px-4 py-3 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {applyingLight ? 'Aplicando...' : 'Aplicar ao ambiente'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    {!confirmed ? (
                      <button onClick={handleSave} className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> Confirmar e Salvar
                      </button>
                    ) : (
                      <div className="flex-[2] py-4 bg-emerald-100 text-emerald-700 rounded-2xl font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> Salvo no Jardim
                      </div>
                    )}
                    <button onClick={resetAiState} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors">
                      Novo Scan
                    </button>
                  </div>
                </motion.div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">
                  {error}
                  <button onClick={resetAiState} className="block mt-2 underline">Tentar novamente</button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Use <b>-</b> quando não souber ou não quiser preencher um campo. O app vai sugerir a melhor combinação possível com base no estoque.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nome da planta</label><div className="text-xs text-slate-500">Ao digitar um nome conhecido, o app tenta preencher nome científico e cuidados básicos automaticamente.</div>
              <input type="text" value={manualPlant.name || ''} onChange={(e) => setManualPlant({ ...manualPlant, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Ex: Babosa" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nome científico</label>
              <input type="text" value={manualPlant.species || UNKNOWN_OPTION} onChange={(e) => setManualPlant({ ...manualPlant, species: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Ex: Aloe vera ou -" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Ambiente</label>
              <select value={manualPlant.locationId || locations[0]?.id || ''} onChange={(e) => setManualPlant({ ...manualPlant, locationId: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                {locations.map((location: any) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Status</label>
              <select value={manualPlant.status || 'Saudável'} onChange={(e) => setManualPlant({ ...manualPlant, status: e.target.value as Plant['status'] })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                {PLANT_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Frequência de rega</label>
              <select value={manualPlant.wateringFrequency || 'Semanal'} onChange={(e) => setManualPlant({ ...manualPlant, wateringFrequency: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                {WATERING_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Tamanho do vaso</label>
              <select value={normalizeChoice(manualPlant.potSize)} onChange={(e) => setManualPlant({ ...manualPlant, potSize: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                {POT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Material de filtragem</label>
              <select value={normalizeChoice(manualPlant.filterMaterial)} onChange={(e) => setManualPlant({ ...manualPlant, filterMaterial: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                {FILTER_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Substrato principal</label>
              <select value={normalizeChoice(manualPlant.substrate)} onChange={(e) => setManualPlant({ ...manualPlant, substrate: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                {SUBSTRATE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <input type="text" value={manualPlant.substrateMix || UNKNOWN_OPTION} onChange={(e) => setManualPlant({ ...manualPlant, substrateMix: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl" placeholder="Detalhes ou mistura personalizada / -" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Drenagem</label>
              <select value={normalizeChoice(manualPlant.drainage)} onChange={(e) => setManualPlant({ ...manualPlant, drainage: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                {DRAINAGE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <input type="text" value={manualPlant.drainageLayer || UNKNOWN_OPTION} onChange={(e) => setManualPlant({ ...manualPlant, drainageLayer: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl" placeholder="Detalhes da camada / -" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Observações</label>
            <textarea value={manualPlant.notes || UNKNOWN_OPTION} onChange={(e) => setManualPlant({ ...manualPlant, notes: e.target.value })} className="w-full h-28 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none" placeholder="Cuidados, histórico, origem da muda ou -" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Foto manual da planta</label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors">
              <Camera className="w-4 h-4" /> Adicionar foto
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleManualImage} />
            </label>
            {manualPlant.image && <img src={manualPlant.image} alt="Planta manual" className="w-full h-48 object-cover rounded-2xl border border-slate-200" />}
          </div>

          <StockSuggestionPanel
            summary={manualStockSuggestion}
            items={manualStockBundle.items}
            onApply={applyManualStockSuggestion}
            disabled={!Object.keys(manualStockBundle.patch).length}
            message={stockMessage}
          />

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button onClick={handleManualSave} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20">
              Salvar planta manualmente
            </button>
            <button
              onClick={() => { setManualPlant({
                name: '', species: UNKNOWN_OPTION, locationId: locations[0]?.id || '', status: 'Saudável', wateringFrequency: 'Semanal', notes: UNKNOWN_OPTION, potSize: UNKNOWN_OPTION, substrate: UNKNOWN_OPTION, drainage: UNKNOWN_OPTION, filterMaterial: UNKNOWN_OPTION, substrateMix: UNKNOWN_OPTION, drainageLayer: UNKNOWN_OPTION, image: ''
              }); setStockMessage(null); }}
              className="sm:w-48 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function SettingsView({ settings, saveSettings, setSettings, data }: any) {
  const [importData, setImportData] = useState('');
  const [apiKeyDraft, setApiKeyDraft] = useState(settings.geminiApiKey || getSavedGeminiKey() || '');
  const [manualAddressDraft, setManualAddressDraft] = useState(settings.gardenAddress || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setApiKeyDraft(settings.geminiApiKey || getSavedGeminiKey() || '');
  }, [settings.geminiApiKey]);

  useEffect(() => {
    setManualAddressDraft(settings.gardenAddress || '');
  }, [settings.gardenAddress]);

  const handleImport = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      safeLocalStorageSet('atena_garden_full_data', JSON.stringify(parsed));
      if (parsed.settings) {
        safeLocalStorageSet('atena_garden_settings', JSON.stringify({ ...parsed.settings, geminiApiKey: '' }));
      }
      window.location.reload();
    } catch (e) {
      alert('Formato de dados inválido. Certifique-se de usar um arquivo JSON correto.');
    }
  };

  const handleFileChange = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        handleImport(content);
      };
      reader.readAsText(file);
    }
  };

  const migrateOldData = () => {
    const possibleKeys = ['atena_garden_data', 'garden_data', 'plants_data'];
    let found = false;
    for (const key of possibleKeys) {
      const oldData = localStorage.getItem(key);
      if (oldData) {
        safeLocalStorageSet('atena_garden_full_data', oldData);
        found = true;
        break;
      }
    }
    if (found) {
      alert('Dados antigos encontrados e migrados! O app irá reiniciar.');
      window.location.reload();
    } else {
      alert('Nenhum dado antigo encontrado automaticamente.');
    }
  };

  const handleApiKeySave = () => {
    saveSettings({ ...settings, geminiApiKey: apiKeyDraft.trim() });
    alert(apiKeyDraft.trim() ? 'Chave da IA salva somente neste dispositivo.' : 'Chave local removida deste dispositivo.');
  };

  const handleManualAddressSave = () => {
    const trimmedAddress = manualAddressDraft.trim();
    saveSettings({
      ...settings,
      weatherMode: 'manual',
      gardenAddress: trimmedAddress,
      geminiApiKey: apiKeyDraft.trim() || settings.geminiApiKey || ''
    });
    alert(trimmedAddress ? `Endereço salvo: ${trimmedAddress}` : 'Digite um endereço antes de salvar.');
  };

  return (
    <motion.div 
      key="settings"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-3xl mx-auto space-y-8 pb-12"
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">IA neste dispositivo</h2>
          <p className="text-slate-500">A chave do Gemini agora é opcional e usada só para textos curtos do jardim. Reconhecimento por imagem, diagnóstico visual e medição de luz rodam localmente em modo básico.</p>
        </div>

        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
          <label className="font-semibold text-slate-700 block">Chave do Gemini</label>
          <input
            type="password"
            placeholder="Cole aqui a sua chave"
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            value={apiKeyDraft}
            onChange={(e) => setApiKeyDraft(e.target.value)}
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleApiKeySave}
              className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
            >
              Salvar chave local
            </button>
            <button
              onClick={() => {
                setApiKeyDraft('');
                saveSettings({ ...settings, geminiApiKey: '' });
              }}
              className="sm:w-48 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
            >
              Remover chave
            </button>
          </div>
          <p className="text-xs text-slate-500">A chave fica salva somente neste navegador. Ela não entra no backup JSON e não exige configuração extra no Netlify.</p>
        </div>

        <div className="pt-8 border-t border-slate-100">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Configurações do Clima</h2>
          <p className="text-slate-500">Defina como o Atena Garden deve obter a previsão do tempo para o seu jardim.</p>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <label className="font-semibold text-slate-700">Modo de Localização</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => saveSettings({ ...settings, weatherMode: 'auto', gardenAddress: manualAddressDraft.trim() || settings.gardenAddress || '', geminiApiKey: apiKeyDraft.trim() || settings.geminiApiKey || '' })}
                className={`p-4 rounded-2xl border-2 transition-all text-left ${settings.weatherMode === 'auto' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
              >
                <div className="font-bold mb-1">Automático</div>
                <div className="text-xs opacity-70">Usa o GPS do seu dispositivo</div>
              </button>
              <button 
                onClick={() => saveSettings({ ...settings, weatherMode: 'manual', gardenAddress: manualAddressDraft.trim() || settings.gardenAddress || '', geminiApiKey: apiKeyDraft.trim() || settings.geminiApiKey || '' })}
                className={`p-4 rounded-2xl border-2 transition-all text-left ${settings.weatherMode === 'manual' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
              >
                <div className="font-bold mb-1">Manual</div>
                <div className="text-xs opacity-70">Digite o endereço do jardim</div>
              </button>
            </div>
          </div>

          {settings.weatherMode === 'manual' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <label className="font-semibold text-slate-700">Endereço do Jardim</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ex: Guarulhos, SP" 
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  value={manualAddressDraft}
                  onChange={(e) => setManualAddressDraft(e.target.value)}
                />
                <button 
                  onClick={handleManualAddressSave}
                  className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-600 transition-colors"
                >
                  Salvar endereço
                </button>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <b className="text-slate-800">Endereço salvo:</b> {settings.gardenAddress?.trim() || 'nenhum endereço salvo ainda'}
              </div>
            </motion.div>
          )}
        </div>

        <div className="pt-8 border-t border-slate-100 space-y-6">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="text-blue-500" /> Backup e Recuperação
          </h3>
          <p className="text-sm text-slate-500">
            Exporte tudo em JSON para guardar uma cópia ou importar em outro aparelho. Esse modo local é o backup principal do app.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button 
              onClick={() => {
                const exportData = { ...data, settings: { ...settings, geminiApiKey: '' } };
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `atena_garden_backup_${new Date().getTime()}.json`;
                a.click();
              }}
              className="flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              <Download className="w-4 h-4" /> Exportar JSON
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
            >
              <Upload className="w-4 h-4" /> Importar Arquivo
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json" 
                onChange={handleFileChange} 
              />
            </button>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <FileJson className="w-4 h-4 text-slate-400" />
              </div>
              <textarea 
                placeholder="Ou cole o código JSON aqui..."
                className="w-full h-24 pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-[10px]"
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
              />
            </div>
            {importData && (
              <button 
                onClick={() => handleImport(importData)}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                Validar e Importar Texto
              </button>
            )}
            <button 
              onClick={migrateOldData}
              className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-400 rounded-xl font-bold hover:border-emerald-500 hover:text-emerald-500 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Tentar Migração Automática
            </button>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4">Sobre o Atena Garden</h3>
          <div className="p-4 bg-slate-50 rounded-2xl text-sm text-slate-600 leading-relaxed">
            Versão 2.0.0 (Local First)<br />
            Seus dados ficam armazenados localmente neste navegador. Faça exportações regulares do backup JSON para não perder seu jardim.
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- Subcomponents ---

function BulkWaterButton({ label, onClick, color, isDone }: { label: string, onClick: () => void, color: string, isDone?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all active:scale-95 relative overflow-hidden ${isDone ? 'bg-emerald-500 text-white border-emerald-600' : color}`}
    >
      {isDone ? (
        <CheckCircle2 className="w-6 h-6 mb-2" />
      ) : (
        <Water className="w-6 h-6 mb-2" />
      )}
      <span className="text-sm font-bold">{label}</span>
      {isDone && (
        <div className="absolute top-1 right-1">
          <div className="w-2 h-2 bg-white rounded-full animate-ping" />
        </div>
      )}
    </button>
  );
}

function SidebarLink({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
        active 
          ? 'bg-emerald-50 text-emerald-700 shadow-sm' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
      {label}
    </button>
  );
}

function MobileNavItem({ icon: Icon, active, onClick }: { icon: any, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`p-2 transition-colors ${active ? 'text-emerald-600' : 'text-slate-400'}`}>
      <Icon className="w-6 h-6" />
    </button>
  );
}

function WeatherStat({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="text-center">
      <Icon className="w-5 h-5 mx-auto mb-2 text-emerald-400" />
      <div className="text-xs text-emerald-300 uppercase tracking-wider mb-1">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-slate-600 font-medium">{label}</span>
      </div>
      <span className="font-bold text-slate-900">{value}</span>
    </div>
  );
}

function GardenSummary({ plants, locations }: any) {
  const plantsByLocation = locations.map((loc: any) => {
    return {
      ...loc,
      plants: plants.filter((p: any) => p.locationId === loc.id)
    };
  });

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex-1 flex flex-col">
      <h3 className="font-bold text-slate-900 mb-6">Resumo por Ambiente</h3>
      <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
        {plantsByLocation.map((loc: any) => (
          <div key={loc.id} className="border-b border-slate-50 pb-5 last:border-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 text-emerald-500" />
                <span className="text-sm font-bold text-slate-700">{loc.name}</span>
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{loc.plants.length} plantas</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {loc.plants.map((p: any) => (
                <div key={p.id} className="group relative">
                  <img 
                    src={p.image || `https://picsum.photos/seed/${p.id}/100/100`} 
                    alt={p.name}
                    className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-md group-hover:scale-110 transition-transform cursor-help"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 font-bold shadow-xl">
                    {p.name}
                  </div>
                </div>
              ))}
              {loc.plants.length === 0 && (
                <span className="text-[10px] text-slate-400 italic font-medium">Nenhuma planta cadastrada</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpecialistTips({ plants, locations, weather, forecast, tasks, germinations, stock, history }: any) {
  const [insights, setInsights] = useState<DailyGardenInsights | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      const local = generateLocalInsights(plants, locations, weather, forecast, germinations, tasks, stock, history);
      const cacheKey = getInsightsCacheKey(local.dayKey);
      let cached: DailyGardenInsights | null = null;
      try {
        const raw = localStorage.getItem(cacheKey);
        cached = raw ? JSON.parse(raw) as DailyGardenInsights : null;
      } catch {
        cached = null;
      }
      if (cached) {
        setInsights({ ...cached, source: 'cache' });
        return;
      }

      if (!plants.length) {
        safeLocalStorageSet(cacheKey, JSON.stringify(local));
        setInsights(local);
        return;
      }

      const apiKey = getSavedGeminiKey();
      if (!apiKey) {
        safeLocalStorageSet(cacheKey, JSON.stringify(local));
        setInsights(local);
        return;
      }

      setLoading(true);
      try {
        const ai = getGeminiClient();
        const model = 'gemini-2.5-flash';
        const context = buildMiniGardenContext(plants, locations, weather, forecast, germinations, tasks, stock, history);
        const response = await ai.models.generateContent({
          model,
          contents: [{ parts: [{ text: buildGeminiInsightsPrompt(context) }] }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                botanistOfDay: { type: Type.STRING },
                priorities: { type: Type.ARRAY, items: { type: Type.STRING } },
                checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
                maintenanceAdvice: { type: Type.STRING },
                routineTips: { type: Type.STRING },
                riskAnalysis: { type: Type.STRING },
                germinationGuidance: { type: Type.STRING },
                repotAdvice: { type: Type.STRING },
                climateManagement: { type: Type.STRING },
                weeklyReview: { type: Type.STRING },
                newPlantsAdvice: { type: Type.STRING },
                oldPlantsAdvice: { type: Type.STRING },
                stockMixAdvice: { type: Type.STRING },
                report: { type: Type.STRING }
              },
              required: ['botanistOfDay', 'priorities', 'checklist', 'maintenanceAdvice', 'routineTips', 'riskAnalysis', 'germinationGuidance', 'repotAdvice', 'climateManagement', 'weeklyReview', 'newPlantsAdvice', 'oldPlantsAdvice', 'stockMixAdvice', 'report']
            }
          }
        });
        const data = JSON.parse(response.text || '{}');
        const merged: DailyGardenInsights = {
          ...local,
          source: 'gemini',
          botanistOfDay: normalizeChoice(data.botanistOfDay) === UNKNOWN_OPTION ? local.botanistOfDay : normalizeChoice(data.botanistOfDay),
          priorities: Array.isArray(data.priorities) && data.priorities.length ? data.priorities.slice(0, 3).map((item: string) => normalizeChoice(item)).filter((item: string) => item !== UNKNOWN_OPTION) : local.priorities,
          checklist: Array.isArray(data.checklist) && data.checklist.length ? data.checklist.slice(0, 5).map((item: string) => normalizeChoice(item)).filter((item: string) => item !== UNKNOWN_OPTION) : local.checklist,
          maintenanceAdvice: normalizeChoice(data.maintenanceAdvice) === UNKNOWN_OPTION ? local.maintenanceAdvice : normalizeChoice(data.maintenanceAdvice),
          routineTips: normalizeChoice(data.routineTips) === UNKNOWN_OPTION ? local.routineTips : normalizeChoice(data.routineTips),
          riskAnalysis: normalizeChoice(data.riskAnalysis) === UNKNOWN_OPTION ? local.riskAnalysis : normalizeChoice(data.riskAnalysis),
          germinationGuidance: normalizeChoice(data.germinationGuidance) === UNKNOWN_OPTION ? local.germinationGuidance : normalizeChoice(data.germinationGuidance),
          repotAdvice: normalizeChoice(data.repotAdvice) === UNKNOWN_OPTION ? local.repotAdvice : normalizeChoice(data.repotAdvice),
          climateManagement: normalizeChoice(data.climateManagement) === UNKNOWN_OPTION ? local.climateManagement : normalizeChoice(data.climateManagement),
          weeklyReview: normalizeChoice(data.weeklyReview) === UNKNOWN_OPTION ? local.weeklyReview : normalizeChoice(data.weeklyReview),
          newPlantsAdvice: normalizeChoice(data.newPlantsAdvice) === UNKNOWN_OPTION ? local.newPlantsAdvice : normalizeChoice(data.newPlantsAdvice),
          oldPlantsAdvice: normalizeChoice(data.oldPlantsAdvice) === UNKNOWN_OPTION ? local.oldPlantsAdvice : normalizeChoice(data.oldPlantsAdvice),
          stockMixAdvice: normalizeChoice(data.stockMixAdvice) === UNKNOWN_OPTION ? local.stockMixAdvice : normalizeChoice(data.stockMixAdvice),
          report: normalizeChoice(data.report) === UNKNOWN_OPTION ? local.report : normalizeChoice(data.report),
        };
        safeLocalStorageSet(cacheKey, JSON.stringify(merged));
        setInsights(merged);
      } catch (error) {
        console.error('Erro ao gerar insights diários:', error);
        safeLocalStorageSet(cacheKey, JSON.stringify(local));
        setInsights(local);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [plants, locations, weather, forecast, tasks, germinations, stock, history]);

  if (!insights) {
    return <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm h-full flex items-center justify-center text-slate-500">Carregando botânico do dia...</div>;
  }

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm h-full flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2"><AlertCircle className="text-amber-500" /> Botânico do Dia</h3>
          <p className="text-sm text-slate-500 mt-1">Clima e texto do dia usam cache. O Gemini só entra em uma chamada curta por dia, quando houver chave.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${insights.source === 'gemini' ? 'bg-emerald-100 text-emerald-700' : insights.source === 'cache' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-700'}`}>
          {insights.source === 'gemini' ? 'Gemini em texto curto' : insights.source === 'cache' ? 'Cache do dia' : 'Modo local'}
        </span>
      </div>
      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 text-amber-900 leading-relaxed">{loading ? <div className="flex items-center gap-2 text-amber-600 animate-pulse"><RefreshCw className="w-4 h-4 animate-spin" /> Gerando a análise do dia...</div> : insights.botanistOfDay}</div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
          <div className="font-bold text-slate-900 mb-3 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-emerald-600" /> Prioridade de Hoje</div>
          <div className="space-y-2">{insights.priorities.map((item, index) => <div key={index} className="text-sm text-slate-700">{index + 1}. {item}</div>)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
          <div className="font-bold text-slate-900 mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-600" /> Checklist Inteligente</div>
          <div className="space-y-2">{insights.checklist.map((item, index) => <div key={index} className="text-sm text-slate-700">• {item}</div>)}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <InsightPanel icon={Heart} title="Conselhos de Manutenção" text={insights.maintenanceAdvice} />
        <InsightPanel icon={Calendar} title="Dicas de Rotina do Dia" text={insights.routineTips} />
        <InsightPanel icon={AlertCircle} title="Análise de Risco" text={insights.riskAnalysis} />
        <InsightPanel icon={Sprout} title="Orientação para Germinação" text={insights.germinationGuidance} />
        <InsightPanel icon={Layers} title="Ajuda para Replantio" text={insights.repotAdvice} />
        <InsightPanel icon={Cloud} title="Manejo por Estação / Clima" text={insights.climateManagement} />
        <InsightPanel icon={History} title="Revisão Semanal" text={insights.weeklyReview} />
        <InsightPanel icon={Package} title="Uso Inteligente do Estoque" text={insights.stockMixAdvice} />
      </div>
      <button onClick={() => setShowDetails(!showDetails)} className="text-emerald-600 font-bold text-sm flex items-center gap-1 hover:underline self-start">{showDetails ? 'Ocultar blocos extras' : 'Ver blocos extras'}<ChevronRight className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-90' : ''}`} /></button>
      <AnimatePresence>
        {showDetails && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 p-4 bg-white"><div className="font-bold text-slate-900 mb-2">Conselhos para plantas novas</div><div className="text-sm text-slate-600 whitespace-pre-wrap">{insights.newPlantsAdvice}</div></div>
              <div className="rounded-2xl border border-slate-200 p-4 bg-white"><div className="font-bold text-slate-900 mb-2">Conselhos para plantas antigas</div><div className="text-sm text-slate-600 whitespace-pre-wrap">{insights.oldPlantsAdvice}</div></div>
              <div className="rounded-2xl border border-slate-200 p-4 bg-white md:col-span-2"><div className="font-bold text-slate-900 mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-slate-500" /> Texto explicativo do app</div><div className="text-sm text-slate-600 whitespace-pre-wrap">{insights.report}</div></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InsightPanel({ icon: Icon, title, text }: { icon: any, title: string, text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 bg-white">
      <div className="font-bold text-slate-900 mb-2 flex items-center gap-2"><Icon className="w-4 h-4 text-emerald-600" /> {title}</div>
      <div className="text-sm text-slate-600 whitespace-pre-wrap">{text}</div>
    </div>
  );
}

function PlantCard({ plant, location, locations = [], onWater, onUpdate, onRepot, onDelete }: { plant: Plant, location?: string, locations?: Location[], onWater?: (id: string) => void, onUpdate?: (p: Plant) => void, onRepot?: (id: string, details: any) => void, onDelete?: (id: string) => void, key?: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(plant);

  useEffect(() => {
    setEditData(plant);
  }, [plant]);

  const environmentRecommendation = useMemo(() => getPlantEnvironmentRecommendation(editData, locations), [editData, locations]);
  const currentLocationMatch = environmentRecommendation.current;
  const bestLocationMatch = environmentRecommendation.best;
  const symptomDiagnosis = useMemo(() => diagnoseSymptomsLocally(editData.symptomNotes || '', editData), [editData]);

  const handleSave = () => {
    const diagnosisPayload = (editData.symptomNotes || '').trim()
      ? {
          probableDiagnosis: symptomDiagnosis.probableDiagnosis,
          possibleTreatment: symptomDiagnosis.possibleTreatment,
          diagnosisUpdatedAt: new Date().toISOString(),
        }
      : {
          probableDiagnosis: '',
          possibleTreatment: '',
          diagnosisUpdatedAt: '',
        };
    if (onUpdate) onUpdate(normalizePlantRecord({ ...editData, ...diagnosisPayload }));
    setIsEditing(false);
  };

  const handleEditImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await readFileAsOptimizedDataUrl(file);
    setEditData(prev => attachPhotoToPlant(normalizePlantRecord(prev), result, 'Evolução registrada manualmente', 'Acompanhamento'));
  };

  const handleRepotClick = () => {
    if (onRepot) {
      onRepot(plant.id, {
        potSize: editData.potSize,
        substrate: editData.substrateMix || editData.substrate,
        drainage: editData.drainageLayer || editData.drainage,
        filterMaterial: editData.filterMaterial
      });
    }
    setIsEditing(false);
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group flex flex-col h-full"
    >
      <div className="aspect-square bg-slate-100 relative overflow-hidden shrink-0">
        <img
          src={plant.image || `https://picsum.photos/seed/${plant.id}/400/400`}
          alt={plant.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onUpdate) onUpdate({ ...plant, isFavorite: !plant.isFavorite });
            }}
            className={`p-2 rounded-full shadow-sm transition-all ${plant.isFavorite ? 'bg-red-500 text-white' : 'bg-white/80 text-slate-400 hover:text-red-500 backdrop-blur-sm'}`}
          >
            <Heart className={`w-4 h-4 ${plant.isFavorite ? 'fill-current' : ''}`} />
          </button>
          <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
            plant.status === 'Saudável' ? 'bg-emerald-500 text-white' :
            plant.status === 'Recuperação' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {plant.status}
          </span>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        {!isEditing ? (
          <>
            <div className="mb-4">
              <h4 className="font-bold text-lg text-slate-900 leading-tight mb-1">{plant.name}</h4>
              <p className="text-sm text-slate-500 italic">{plant.species}</p>
            </div>

            <div className="space-y-2 mb-6 flex-1">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400" /> {location}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Water className="w-4 h-4 text-emerald-500" /> {plant.wateringFrequency}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" /> Rega: {plant.lastWatered ? new Date(plant.lastWatered).toLocaleDateString() : 'Nunca'}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <RefreshCw className="w-4 h-4 text-blue-500" /> Replantio: {plant.lastRepotted ? new Date(plant.lastRepotted).toLocaleDateString() : 'Nunca'}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <History className="w-4 h-4 text-violet-500" /> Vida no jardim: {getPlantLifeLabel(plant.createdAt)}
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-900 space-y-1">
                <div><b>Compatibilidade do local atual:</b> {currentLocationMatch ? `${currentLocationMatch.label} (${currentLocationMatch.score}%)` : 'Sem ambiente definido'}</div>
                <div><b>Melhor ambiente sugerido:</b> {bestLocationMatch?.name || '-'} • {bestLocationMatch?.label || '-'} ({bestLocationMatch?.score || 0}%)</div>
                <div>{bestLocationMatch?.reason || 'Cadastre ambientes para receber recomendação automática.'}</div>
                {bestLocationMatch?.id && bestLocationMatch.id !== plant.locationId && onUpdate && (
                  <button
                    onClick={() => onUpdate(normalizePlantRecord({ ...plant, locationId: bestLocationMatch.id }))}
                    className="mt-2 inline-flex rounded-xl bg-white px-3 py-2 font-bold text-blue-700 hover:bg-blue-100"
                  >
                    Mover para ambiente sugerido
                  </button>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Especificações</div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Box className="w-3.5 h-3.5 text-slate-400" /> Vaso: {plant.potSize || '---'}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Layers className="w-3.5 h-3.5 text-slate-400" /> Substrato: {plant.substrateMix || plant.substrate || '---'}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Droplets className="w-3.5 h-3.5 text-slate-400" /> Drenagem: {plant.drainageLayer || plant.drainage || '---'}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <FileText className="w-3.5 h-3.5 text-slate-400" /> Material Filtragem: {plant.filterMaterial || '---'}
                </div>
              </div>

              {(plant.symptomNotes || plant.probableDiagnosis || plant.possibleTreatment) && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sintomas e diagnóstico provável</div>
                  {plant.symptomNotes && <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-900"><b>Sintomas observados:</b> {plant.symptomNotes}</div>}
                  {plant.probableDiagnosis && <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-900"><b>Diagnóstico provável:</b> {plant.probableDiagnosis}</div>}
                  {plant.possibleTreatment && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-900"><b>Possível tratamento:</b> {plant.possibleTreatment}</div>}
                  {plant.diagnosisUpdatedAt && <div className="text-[10px] text-slate-400">Última análise local: {new Date(plant.diagnosisUpdatedAt).toLocaleDateString()}</div>}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Histórico de fotos</div>
                <div className="text-xs text-slate-500">{plant.photoHistory?.length || (plant.image ? 1 : 0)} registro(s)</div>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {(plant.photoHistory?.length ? plant.photoHistory : plant.image ? [createPhotoEntry(plant.image, 'Foto principal atual', 'Cadastro', plant.createdAt)] : []).map((entry) => (
                  <div key={entry.id} className="min-w-[96px] max-w-[96px]">
                    <img src={entry.image} alt={entry.note || plant.name} className="h-24 w-24 object-cover rounded-2xl border border-slate-200" />
                    <div className="mt-1 text-[10px] text-slate-500 leading-tight">{new Date(entry.date).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onWater && onWater(plant.id)}
                className="flex-1 bg-emerald-500 text-white py-2 rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors shadow-md shadow-emerald-500/10"
              >
                Regar
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-emerald-600 hover:bg-emerald-50 transition-all"
              >
                <Edit3 className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4 flex-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-400">Nome</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={e => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-400">Espécie</label>
                <input
                  type="text"
                  value={editData.species || ''}
                  onChange={e => setEditData({ ...editData, species: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Status</label>
                <select
                  value={editData.status}
                  onChange={e => setEditData({ ...editData, status: e.target.value as Plant['status'] })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {PLANT_STATUS_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Rega</label>
                <select
                  value={editData.wateringFrequency}
                  onChange={e => setEditData({ ...editData, wateringFrequency: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {WATERING_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Ambiente</label>
              <select
                value={editData.locationId}
                onChange={e => setEditData({ ...editData, locationId: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              >
                {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Vaso</label>
                <input
                  type="text"
                  value={editData.potSize || ''}
                  onChange={e => setEditData({ ...editData, potSize: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  placeholder="Ex: Médio ou -"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Filtragem</label>
                <select
                  value={normalizeChoice(editData.filterMaterial)}
                  onChange={e => setEditData({ ...editData, filterMaterial: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {FILTER_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Substrato</label>
                <select
                  value={normalizeChoice(editData.substrate)}
                  onChange={e => setEditData({ ...editData, substrate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {SUBSTRATE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
                <input
                  type="text"
                  value={editData.substrateMix || ''}
                  onChange={e => setEditData({ ...editData, substrateMix: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  placeholder="Mistura ou detalhe"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Drenagem</label>
                <select
                  value={normalizeChoice(editData.drainage)}
                  onChange={e => setEditData({ ...editData, drainage: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {DRAINAGE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
                <input
                  type="text"
                  value={editData.drainageLayer || ''}
                  onChange={e => setEditData({ ...editData, drainageLayer: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  placeholder="Camada ou detalhe"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Observações</label>
              <textarea
                value={editData.notes || ''}
                onChange={e => setEditData({ ...editData, notes: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg resize-none h-20"
                placeholder="Anotações úteis"
              />
            </div>

            <div className="space-y-2 rounded-2xl border border-amber-100 bg-amber-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] uppercase font-bold text-amber-700">Sintomas observados</label>
                <button
                  onClick={() => setEditData(prev => ({ ...prev, probableDiagnosis: symptomDiagnosis.probableDiagnosis, possibleTreatment: symptomDiagnosis.possibleTreatment, diagnosisUpdatedAt: new Date().toISOString() }))}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-900"
                  type="button"
                >
                  Atualizar análise local
                </button>
              </div>
              <textarea
                value={editData.symptomNotes || ''}
                onChange={e => setEditData({ ...editData, symptomNotes: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-amber-200 rounded-lg resize-none h-24"
                placeholder="Ex: folhas amareladas, manchas, pontas secas, caule mole, presença de pragas..."
              />
              {(editData.symptomNotes || symptomDiagnosis.probableDiagnosis) && (
                <div className="space-y-2 text-xs">
                  <div className="rounded-xl bg-white border border-amber-100 px-3 py-2 text-slate-700"><b>Diagnóstico provável:</b> {symptomDiagnosis.probableDiagnosis || 'Descreva os sintomas para gerar uma análise local.'}</div>
                  <div className="rounded-xl bg-white border border-emerald-100 px-3 py-2 text-slate-700"><b>Possível tratamento:</b> {symptomDiagnosis.possibleTreatment || 'Descreva os sintomas para receber um cuidado inicial.'}</div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-400">Foto manual / evolução</label>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors">
                <Camera className="w-4 h-4" /> Adicionar foto de evolução
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleEditImage} />
              </label>
              {editData.image && <img src={editData.image} alt={editData.name} className="w-full h-40 object-cover rounded-2xl border border-slate-200" />}
            </div>

            <div className="flex flex-col gap-2 pt-4">
              <button
                onClick={handleSave}
                className="w-full bg-emerald-500 text-white py-2 rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors"
              >
                Salvar Alterações
              </button>
              <button
                onClick={handleRepotClick}
                className="w-full bg-blue-500 text-white py-2 rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors"
              >
                Registrar Replantio
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Remover ${plant.name} do jardim?`)) {
                    onDelete?.(plant.id);
                  }
                }}
                className="w-full bg-red-50 text-red-600 py-2 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Excluir planta
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="w-full bg-slate-100 text-slate-600 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TaskItem({ title, date }: { title: string, date: string, key?: any }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-emerald-50 transition-colors cursor-pointer">
      <div className="flex items-center gap-4">
        <div className="w-6 h-6 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center group-hover:border-emerald-500 transition-colors">
          <CheckCircle2 className="w-4 h-4 text-transparent group-hover:text-emerald-500 transition-colors" />
        </div>
        <div>
          <div className="font-bold text-slate-900">{title}</div>
          <div className="text-xs text-slate-500">{date}</div>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500" />
    </div>
  );
}

function SeedIdentifyView({ stock, onStartGermination, addToHistory }: { stock: StockItem[], onStartGermination: (g: Germination) => void, addToHistory: (item: any) => void }) {
  const [image, setImage] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [seedData, setSeedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCapture = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        identifySeed(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startGermination = () => {
    if (!seedData) return;
    const newGermination: Germination = {
      id: Math.random().toString(36).substr(2, 9),
      name: seedData.name,
      startDate: new Date().toISOString(),
      expectedDays: seedData.estimatedGerminationDays || 7,
      status: 'Em andamento',
      notes: `Classificação local.  ${seedData.plantingInstructions}${seedData.warmWaterHydration ? `\n\nInstruções de Hidratação: ${seedData.hydrationInstructions}` : ''}`,
      lastWatered: new Date().toISOString(),
      hydratedWithWarmWater: hydrated
    };
    onStartGermination(newGermination);
    addToHistory({
      type: 'Semente',
      title: seedData.name,
      details: `Germinação estimada: ${seedData.estimatedGerminationDays} dias\nInstruções: ${seedData.plantingInstructions}`,
      image: image || undefined
    });
    setConfirmed(true);
  };

  const identifySeed = async (base64Image: string) => {
    setIdentifying(true);
    setError(null);
    setConfirmed(false);
    try {
      setSeedData(identifySeedLocally(stock));
      setError('A identificação por foto agora usa IA local básica. Revise manualmente antes de iniciar a germinação.');
    } finally {
      setIdentifying(false);
    }
  };

  return (
    <motion.div 
      key="seed-identify"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Identificador de Sementes</h2>
        <p className="text-slate-500">Identifique a embalagem e receba dicas personalizadas com base no seu estoque. Quando necessário, o app usa uma análise local básica para você continuar.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
        {!image ? (
          <div className="aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-slate-400">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
              <PackageSearch className="w-8 h-8" />
            </div>
            <label className="cursor-pointer bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2">
              <Camera className="w-5 h-5" /> Escanear Embalagem
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
            </label>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="aspect-video rounded-2xl overflow-hidden relative border border-slate-200 shadow-inner">
              <img src={image} alt="Embalagem capturada" className="w-full h-full object-cover" />
              {identifying && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                  <span className="font-bold">Analisando embalagem...</span>
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5" /> {error}
              </div>
            )}

            {seedData && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                  <h3 className="text-xl font-bold text-emerald-900 mb-2">{seedData.name}</h3>
                  <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
                    <Calendar className="w-4 h-4" /> Germinação em aprox. {seedData.estimatedGerminationDays} dias
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-emerald-500" /> Como Plantar
                    </h4>
                    <div className="p-4 bg-slate-50 rounded-2xl text-slate-600 text-sm leading-relaxed">
                      {seedData.plantingInstructions}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <Box className="w-5 h-5 text-blue-500" /> Sugestões do seu Estoque
                    </h4>
                    <div className="p-4 bg-blue-50 rounded-2xl text-blue-800 text-sm leading-relaxed border border-blue-100">
                      {seedData.stockSuggestions}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <FlaskConical className="w-5 h-5 text-purple-500" /> Técnicas de germinação locais
                    </h4>
                    <div className="p-4 bg-purple-50 rounded-2xl text-purple-900 text-sm leading-relaxed border border-purple-100">
                      {seedData.germinationTechniques}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-sm text-amber-900">
                      <b>Luz ideal na germinação</b><br />{seedData.recommendedLight}
                    </div>
                    <div className="p-4 bg-cyan-50 rounded-2xl border border-cyan-100 text-sm text-cyan-900">
                      <b>Rega ideal</b><br />{seedData.wateringTips}
                    </div>
                  </div>

                  {seedData.warmWaterHydration && (
                    <div className="p-6 bg-amber-50 rounded-3xl border border-amber-200 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <Droplets className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-amber-900">Dica: Hidratação com Água Morna</h4>
                          <p className="text-amber-800 text-sm mt-1">{seedData.hydrationInstructions}</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-3 p-3 bg-white/50 rounded-xl cursor-pointer hover:bg-white transition-colors border border-amber-200/50">
                        <input 
                          type="checkbox" 
                          checked={hydrated}
                          onChange={(e) => setHydrated(e.target.checked)}
                          className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-sm font-bold text-amber-900 italic">Já realizei a hidratação com água morna</span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  {!confirmed ? (
                    <button 
                      onClick={startGermination}
                      className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      <FlaskConical className="w-5 h-5" /> Confirmar e Começar
                    </button>
                  ) : (
                    <div className="flex-1 py-4 bg-emerald-100 text-emerald-700 rounded-2xl font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5" /> Germinação Iniciada
                    </div>
                  )}
                  <button 
                    onClick={() => { setImage(null); setSeedData(null); setConfirmed(false); }}
                    className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    Novo Scan
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

