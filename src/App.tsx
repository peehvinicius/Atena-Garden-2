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

const UNKNOWN_OPTION = '-';
const PLANT_STATUS_OPTIONS: Plant['status'][] = ['Saudável', 'Recuperação', 'Problema', 'Muda'];
const WATERING_OPTIONS = ['Diária', 'Semanal', 'Quinzenal', 'Mensal'];
const POT_OPTIONS = [UNKNOWN_OPTION, 'Copo/mini vaso', 'Pequeno', 'Médio', 'Grande', 'Jardineira'];
const SUBSTRATE_OPTIONS = [UNKNOWN_OPTION, 'Terra vegetal', 'Terra + húmus', 'Substrato para folhagens', 'Substrato para suculentas', 'Terra + areia', 'Casca de pinus + perlita'];
const DRAINAGE_OPTIONS = [UNKNOWN_OPTION, 'Sem drenagem extra', 'Argila expandida', 'Brita', 'Areia grossa', 'Carvão vegetal'];
const FILTER_OPTIONS = [UNKNOWN_OPTION, 'Sem manta', 'Manta bidim', 'Tela plástica', 'Filtro de café'];
const STOCK_USAGE_TAGS = ['Substrato', 'Drenagem', 'Filtragem', 'Vaso', 'Ferramenta', 'Adubação', 'Germinação', 'Sementes & Mudas', 'Defensivo', 'Irrigação', 'Suporte', 'Outro'];

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

async function analyzeLightWithAI(base64Image: string): Promise<LightAnalysisResult> {
  const ai = getGeminiClient();
  const model = 'gemini-2.5-flash';
  const response = await ai.models.generateContent({
    model,
    contents: [{
      parts: [
        { text: `Analise esta foto do local ou da planta no ambiente e estime a luminosidade do ponto fotografado. Responda em Português do Brasil em JSON.

Escolha level entre: ${LIGHT_LEVEL_OPTIONS.join(', ')}.
Escolha sunPeriod entre: ${SUN_PERIOD_OPTIONS.join(', ')}.
Explique de forma breve por que chegou nessa conclusão.
Dê uma dica curta de cultivo para esse tipo de luz.
No campo middayTip, sempre oriente que a medição ideal deve ser feita ao meio-dia para maior precisão do pico de luminosidade.` },
        { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } }
      ]
    }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          level: { type: Type.STRING },
          sunPeriod: { type: Type.STRING },
          explanation: { type: Type.STRING },
          tip: { type: Type.STRING },
          middayTip: { type: Type.STRING }
        },
        required: ['level', 'sunPeriod', 'explanation', 'tip', 'middayTip']
      }
    }
  });
  const data = JSON.parse(response.text || '{}');
  return {
    level: normalizeLightLevel(data.level),
    sunPeriod: normalizeSunPeriod(data.sunPeriod),
    explanation: normalizeChoice(data.explanation),
    tip: normalizeChoice(data.tip),
    middayTip: normalizeChoice(data.middayTip) === UNKNOWN_OPTION ? MIDDAY_LIGHT_GUIDE : normalizeChoice(data.middayTip),
  };
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

    const getWeatherData = async (latitude: number, longitude: number, label: string) => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
        );
        const data = await response.json();

        const weatherCodeMap: Record<number, string> = {
          0: 'Céu Limpo', 1: 'Principalmente Limpo', 2: 'Parcialmente Nublado', 3: 'Nublado',
          45: 'Nevoeiro', 48: 'Nevoeiro com geada', 51: 'Garoa Leve', 61: 'Chuva Leve',
          80: 'Pancadas de Chuva', 95: 'Trovoada'
        };

        setWeather({
          temp: Math.round(data.current.temperature_2m),
          condition: weatherCodeMap[data.current.weather_code] || 'Variável',
          humidity: data.current.relative_humidity_2m,
          wind: Math.round(data.current.wind_speed_10m),
          rainProb: data.daily.precipitation_probability_max[0],
          locationName: label
        });

        setForecast({
          tempMax: Math.round(data.daily.temperature_2m_max[1]),
          tempMin: Math.round(data.daily.temperature_2m_min[1]),
          condition: weatherCodeMap[data.daily.weather_code[1]] || 'Variável',
          rainProb: data.daily.precipitation_probability_max[1]
        });
      } catch (e) {
        console.error('Weather fetch error', e);
      } finally {
        setLoadingWeather(false);
      }
    };

    if (currentSettings.weatherMode === 'manual' && currentSettings.gardenAddress) {
      try {
        // Geocoding using Open-Meteo Geocoding API
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(currentSettings.gardenAddress)}&count=1&language=pt&format=json`);
        const geoData = await geoRes.json();
        
        if (geoData.results && geoData.results.length > 0) {
          const { latitude, longitude, name, admin1 } = geoData.results[0];
          await getWeatherData(latitude, longitude, `${name}, ${admin1 || ''}`);
        } else {
          throw new Error('Endereço não encontrado');
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        setLoadingWeather(false);
      }
    } else {
      // Auto mode
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await getWeatherData(position.coords.latitude, position.coords.longitude, 'Sua Localização');
        },
        () => {
          setWeather({
            temp: 25,
            condition: 'Localização Desativada',
            humidity: 50,
            wind: 10,
            rainProb: 0,
            locationName: 'Configure um endereço'
          });
          setLoadingWeather(false);
        }
      );
    }
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

      if (plantsList.length > 0) setPlants(plantsList);
      if (logsList.length > 0) setLogs(logsList);
      if (stockList.length > 0) setStock(stockList.map((item: any) => ({
        category: item.category || 'Insumos Gerais',
        usageTags: inferStockUsageTags(item),
        ...item,
      })));
      if (germinationsList.length > 0) setGerminations(germinationsList);
      if (tasksList.length > 0) setTasks(tasksList);
      if (historyList.length > 0) setHistory(historyList);
      if (locationsList.length > 0) setLocations(locationsList.map((location: any) => normalizeLocation(location)));
    } else {
      // Default data
      setPlants([
        { id: '1', name: 'Manjericão', species: 'Ocimum basilicum', locationId: '1', status: 'Saudável', wateringFrequency: 'Diária', lastWatered: new Date().toISOString(), potSize: 'Médio', substrateMix: 'Terra Vegetal + Húmus' },
        { id: '2', name: 'Lírio da Paz', species: 'Spathiphyllum', locationId: '3', status: 'Saudável', wateringFrequency: 'Semanal' },
        { id: '3', name: 'Babosa', species: 'Aloe vera', locationId: '2', status: 'Recuperação', wateringFrequency: 'Quinzenal' },
      ]);
      setStock([
        { id: '1', name: 'Terra Vegetal', quantity: 5, unit: 'kg', minQuantity: 0, category: 'Substratos & Solos', usageTags: ['Substrato'] },
        { id: '2', name: 'Húmus de Minhoca', quantity: 1, unit: 'kg', minQuantity: 0, category: 'Substratos & Solos', usageTags: ['Substrato', 'Adubação'] },
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
    localStorage.setItem('atena_garden_dismissed_alerts', JSON.stringify(dismissedAlertIds));
  }, [dismissedAlertIds]);

  useEffect(() => {
    const dataToSave = { plants, logs, stock, germinations, tasks, history, locations };
    localStorage.setItem('atena_garden_full_data', JSON.stringify(dataToSave));
  }, [plants, logs, stock, germinations, tasks, history, locations]);

  const saveSettings = (newSettings: AppSettings) => {
    const sanitizedSettings = { ...newSettings, geminiApiKey: newSettings.geminiApiKey || '' };
    setSettings(sanitizedSettings);
    localStorage.setItem('atena_garden_settings', JSON.stringify({ ...sanitizedSettings, geminiApiKey: '' }));
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
          ? { ...p, lastWatered: now } 
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
      p.id === plantId ? { ...p, lastWatered: now } : p
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
      let newPlants = prev.map(p => p.id === updatedPlant.id ? updatedPlant : p);
      
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
      notes: [current.notes, `Leitura IA: ${analysis.explanation}`, analysis.middayTip].filter(Boolean).join('\n'),
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
    setGerminations(prev => prev.map(g => g.id === updated.id ? updated : g));
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
    };

    setPlants(prev => [newPlant, ...prev]);
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
          <SidebarLink icon={Bug} label="Diagnóstico IA" active={activeTab === 'diagnose'} onClick={() => setActiveTab('diagnose')} />
          
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
          <MobileNavItem icon={Bug} active={activeTab === 'diagnose'} onClick={() => setActiveTab('diagnose')} />
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
            <StockView stock={stock} setStock={setStock} addToHistory={addToHistory} />
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

          {activeTab === 'diagnose' && (
            <DiagnoseView addToHistory={addToHistory} setToast={setToast} />
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

function DashboardView({ weather, loadingWeather, fetchWeather, forecast, stats, filteredPlants, locations, setActiveTab, tasks, setWateringConfirmation, history, wateredToday, activeAlerts }: any) {
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
        
        <SpecialistTips plants={filteredPlants} locations={locations} weather={weather} forecast={forecast} />
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
    notes: ''
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
      notes: ''
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
          notes: [prev.notes, `Leitura IA: ${analysis.explanation}`, analysis.middayTip].filter(Boolean).join('\n')
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
  const [manualSeed, setManualSeed] = useState({ name: '', species: '', expectedDays: 7, notes: '' });
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
    onStartGermination({
      id: Math.random().toString(36).slice(2, 9),
      name: manualSeed.name.trim(),
      species: manualSeed.species.trim(),
      startDate: new Date().toISOString(),
      expectedDays: Number(manualSeed.expectedDays) || 7,
      status: 'Em andamento',
      notes: manualSeed.notes,
      lastWatered: new Date().toISOString(),
      germinationTechniques: 'Registro manual de germinação.',
      wateringTips: 'Mantenha o substrato levemente úmido, sem encharcar.'
    } as Germination);
    setManualSeed({ name: '', species: '', expectedDays: 7, notes: '' });
  };

  const startTransfer = (germination: Germination) => {
    setTransferingId(germination.id);
    setTransferDraft({
      name: germination.name,
      species: germination.species || '',
      locationId: locations[0]?.id || '',
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
              <button 
                onClick={onNewPlanting}
                className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors"
              >
                <Plus className="w-4 h-4" /> Novo por IA
              </button>
            )}
          </div>
          <p className="text-sm text-slate-500">Gerencie rega, evolução da germinação e transfira automaticamente para o jardim quando a muda estiver pronta.</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-700">Adicionar germinação manual</h3>
          <input value={manualSeed.name} onChange={(e) => setManualSeed({ ...manualSeed, name: e.target.value })} placeholder="Nome da semente" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <input value={manualSeed.species} onChange={(e) => setManualSeed({ ...manualSeed, species: e.target.value })} placeholder="Espécie" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl" />
            <input type="number" value={manualSeed.expectedDays} onChange={(e) => setManualSeed({ ...manualSeed, expectedDays: Number(e.target.value) })} placeholder="Dias" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl" />
          </div>
          <textarea value={manualSeed.notes} onChange={(e) => setManualSeed({ ...manualSeed, notes: e.target.value })} placeholder="Técnicas, lembretes ou observações" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl min-h-[88px]" />
          <button onClick={addManualGermination} className="w-full bg-emerald-500 text-white py-3 rounded-2xl font-bold hover:bg-emerald-600 transition-colors">Salvar germinação manual</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {germinations.map((g: any) => {
          const daysElapsed = Math.max(0, Math.floor((Date.now() - new Date(g.startDate).getTime()) / 86400000));
          const progress = Math.min(100, Math.round((daysElapsed / Math.max(g.expectedDays, 1)) * 100));
          const canTransfer = g.status === 'Sucesso' || (g.status === 'Em andamento' && daysElapsed >= Math.max(g.expectedDays - 1, 1));

          return (
            <div key={g.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-bold text-lg">{g.name}</h3>
                  <p className="text-sm text-slate-500 italic">{g.species || 'Espécie não informada'}</p>
                </div>
                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${g.status === 'Em andamento' ? 'bg-blue-100 text-blue-600' : g.status === 'Sucesso' ? 'bg-emerald-100 text-emerald-600' : g.status === 'Transferida' ? 'bg-purple-100 text-purple-600' : 'bg-red-100 text-red-600'}`}>
                  {g.status}
                </span>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between"><span>Início:</span> <b>{new Date(g.startDate).toLocaleDateString()}</b></div>
                <div className="flex justify-between"><span>Expectativa:</span> <b>{g.expectedDays} dias</b></div>
                <div className="flex justify-between"><span>Passaram:</span> <b>{daysElapsed} dias</b></div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Progresso</span><span>{progress}%</span></div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} /></div>
              </div>

              {g.image && <img src={g.image} alt={g.name} className="w-full h-40 object-cover rounded-2xl border border-slate-200" />}

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

              {canTransfer && !g.transferredPlantId && (
                <button onClick={() => startTransfer(g)} className="w-full px-4 py-3 rounded-2xl bg-purple-600 text-white font-bold hover:bg-purple-700">Transferir automaticamente para o jardim</button>
              )}

              {transferingId === g.id && (
                <div className="mt-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-900">Criar planta no jardim</h4>
                  <input value={transferDraft.name || ''} onChange={(e) => setTransferDraft({ ...transferDraft, name: e.target.value })} placeholder="Nome da muda" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl" />
                  <div className="grid grid-cols-2 gap-3">
                    <input value={transferDraft.species || ''} onChange={(e) => setTransferDraft({ ...transferDraft, species: e.target.value })} placeholder="Espécie" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl" />
                    <select value={transferDraft.locationId || ''} onChange={(e) => setTransferDraft({ ...transferDraft, locationId: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl">
                      {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={transferDraft.potSize || ''} onChange={(e) => setTransferDraft({ ...transferDraft, potSize: e.target.value })} placeholder="Tamanho do vaso" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl" />
                    <select value={transferDraft.wateringFrequency || 'Semanal'} onChange={(e) => setTransferDraft({ ...transferDraft, wateringFrequency: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl">
                      <option>Diária</option>
                      <option>Semanal</option>
                      <option>Quinzenal</option>
                      <option>Mensal</option>
                    </select>
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
            <button 
              onClick={onNewPlanting}
              className="mt-4 text-emerald-600 font-bold hover:underline"
            >
              Começar um novo plantio agora
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StockView({ stock, setStock, addToHistory }: { stock: StockItem[], setStock: React.Dispatch<React.SetStateAction<StockItem[]>>, addToHistory: (item: Omit<HistoryItem, 'id' | 'date'>) => void }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAiForm, setShowAiForm] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<any>(null);
  const [newItem, setNewItem] = useState<Partial<StockItem>>({ name: '', quantity: 0, unit: 'kg', minQuantity: 0, category: 'Substratos & Solos', usageTags: [], notes: '', image: '' });

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

  const resetNewItem = () => setNewItem({ name: '', quantity: 0, unit: 'kg', minQuantity: 0, category: 'Substratos & Solos', usageTags: [], notes: '', image: '' });

  const toggleUsageTag = (tag: string) => {
    setNewItem(prev => {
      const current = inferStockUsageTags(prev as StockItem);
      const next = current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag];
      return { ...prev, usageTags: next };
    });
  };

  const handleAddItem = () => {
    if (!newItem.name) return;
    const item: StockItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: normalizeChoice(newItem.name),
      quantity: Number(newItem.quantity || 0),
      unit: normalizeChoice(newItem.unit || 'un'),
      minQuantity: 0,
      category: newItem.category || 'Outros',
      usageTags: inferStockUsageTags(newItem as StockItem),
      notes: normalizeChoice(newItem.notes),
      image: newItem.image || undefined,
    };
    setStock(prev => [...prev, item]);
    addToHistory({
      type: 'Atualização',
      title: `Item de estoque cadastrado: ${item.name}`,
      details: `Categoria: ${item.category}. Usos no app: ${item.usageTags?.join(', ') || '-'}. Quantidade inicial: ${item.quantity} ${item.unit}.`
    });
    setShowAddForm(false);
    setAiPreview(null);
    setShowAiForm(false);
    resetNewItem();
  };

  const deleteItem = (id: string) => {
    setStock(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setStock(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i));
  };

  const handleImageSelection = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setNewItem(prev => ({ ...prev, image: result }));
      identifyStockItem(result);
    };
    reader.readAsDataURL(file);
  };

  const identifyStockItem = async (base64Image: string) => {
    setIdentifying(true);
    setAiError(null);
    setAiPreview(null);
    try {
      const ai = getGeminiClient();
      const model = 'gemini-2.5-flash';
      const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [
          { text: `Analise a imagem de um item de jardinagem ou cultivo e identifique o que provavelmente é. Responda em Português do Brasil em JSON.

Escolha a melhor categoria principal entre: ${categories.join(', ')}.
Escolha uma ou mais categorias de uso no app entre: ${STOCK_USAGE_TAGS.join(', ')}.
Escolha a melhor unidade entre: ${units.join(', ')}.
Quando houver dúvida, use '-' em notes curtas ou suggestedUse.

Campos esperados:
- name: nome provável do item
- category: categoria principal mais adequada
- usageTags: lista com uma ou mais categorias de uso no app
- unit: unidade mais provável de controle
- notes: resumo curto do que é ou para que serve
- suggestedUse: como esse item costuma ser usado no jardim
- confidence: Alta, Média ou Baixa` },
          { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } }
        ] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              usageTags: { type: Type.ARRAY, items: { type: Type.STRING } },
              unit: { type: Type.STRING },
              notes: { type: Type.STRING },
              suggestedUse: { type: Type.STRING },
              confidence: { type: Type.STRING }
            },
            required: ['name', 'category', 'usageTags', 'unit', 'notes', 'suggestedUse', 'confidence']
          }
        }
      });
      const data = JSON.parse(response.text || '{}');
      const safeCategory = categories.includes(data.category) ? data.category : 'Outros';
      const safeUnit = units.includes(data.unit) ? data.unit : 'un';
      const safeUsageTags = normalizeStockUsageTags(data.usageTags).length ? normalizeStockUsageTags(data.usageTags) : inferStockUsageTags({ name: data.name, category: safeCategory, notes: [data.notes, data.suggestedUse].filter(Boolean).join(' ') });
      const notes = [normalizeChoice(data.notes), normalizeChoice(data.suggestedUse) !== '-' ? `Uso sugerido: ${normalizeChoice(data.suggestedUse)}` : ''].filter(Boolean).join(' • ');
      const preview = {
        name: normalizeChoice(data.name),
        category: safeCategory,
        usageTags: safeUsageTags,
        unit: safeUnit,
        notes,
        confidence: normalizeChoice(data.confidence)
      };
      setAiPreview(preview);
      setNewItem(prev => ({
        ...prev,
        name: preview.name,
        category: preview.category,
        unit: preview.unit,
        usageTags: preview.usageTags,
        notes: preview.notes,
        quantity: prev.quantity ?? 0,
      }));
      setShowAddForm(true);
      addToHistory({
        type: 'Atualização',
        title: `IA analisou item de estoque: ${preview.name}`,
        details: `Categoria sugerida: ${preview.category}. Usos no app: ${preview.usageTags?.join(', ') || '-'}. Confiança: ${preview.confidence}.`
      });
    } catch (err) {
      console.error(err);
      setAiError(getGeminiErrorMessage(err, 'Não consegui identificar esse item de estoque agora. Tente outra foto ou faça o cadastro manual.'));
    } finally {
      setIdentifying(false);
    }
  };

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
          <p className="text-slate-500">Gerencie seus materiais sem alertas de nível crítico e use IA para acelerar o cadastro dos itens.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => { setShowAiForm(prev => !prev); setAiError(null); }}
            className="bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
          >
            <PackageSearch className="w-5 h-5" /> Identificar item por IA
          </button>
          <button 
            onClick={() => { setShowAddForm(true); setShowAiForm(false); }}
            className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-5 h-5" /> Novo Item
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAiForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Identificação de item do estoque por IA</h3>
                <p className="text-slate-500 text-sm mt-1">Tire uma foto do saco, embalagem, vaso, ferramenta ou insumo. A IA tenta reconhecer o item e preencher a ficha para você revisar.</p>
              </div>
              {!newItem.image ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div className="text-slate-500 text-sm">Fotografe o item para a IA sugerir nome, categoria, unidade e uso.</div>
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
                    {identifying && (
                      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-5 text-blue-700 font-medium flex items-center gap-3">
                        <RefreshCw className="w-5 h-5 animate-spin" /> A IA está analisando o item do estoque...
                      </div>
                    )}
                    {aiPreview && (
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Sugestão da IA</div>
                            <div className="text-xl font-bold text-emerald-950 mt-1">{aiPreview.name}</div>
                          </div>
                          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">Confiança {aiPreview.confidence}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                          <span className="rounded-full bg-white px-3 py-1 text-slate-700 border border-slate-200">Categoria: {aiPreview.category}</span>
                          <span className="rounded-full bg-white px-3 py-1 text-slate-700 border border-slate-200">Unidade: {aiPreview.unit}</span>
                        </div>
                        {aiPreview.usageTags?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {aiPreview.usageTags.map((tag: string) => (
                              <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">Uso no app: {tag}</span>
                            ))}
                          </div>
                        )}
                        <p className="text-sm text-emerald-900 leading-relaxed">{aiPreview.notes || '-'}</p>
                        <div className="text-sm text-emerald-700">A ficha abaixo já foi preenchida com essa sugestão. Revise a quantidade e salve quando quiser.</div>
                      </div>
                    )}
                    {aiError && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm font-medium text-red-600">{aiError}</div>}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nome do Item</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Terra Vegetal"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    value={newItem.name || ''}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Categoria</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    value={newItem.category || 'Substratos & Solos'}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Qtd Atual</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      value={newItem.quantity ?? 0}
                      onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Unidade</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      value={newItem.unit || 'kg'}
                      onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                    >
                      {units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                    </select>
                  </div>
                </div>
                <div className="md:col-span-2 lg:col-span-3 space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Observações</label>
                  <textarea 
                    rows={3}
                    placeholder="Para que serve, como você usa ou qualquer observação importante."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    value={newItem.notes || ''}
                    onChange={(e) => setNewItem({...newItem, notes: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3 space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Categorias de uso no app</label>
                  <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    {STOCK_USAGE_TAGS.map(tag => {
                      const active = inferStockUsageTags(newItem as StockItem).includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleUsageTag(tag)}
                          className={`rounded-full px-3 py-2 text-xs font-bold transition-colors border ${active ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-200 hover:text-blue-700'}`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500">Você pode marcar mais de uma categoria de uso. Isso melhora as sugestões automáticas do app.</p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => { setShowAddForm(false); setAiPreview(null); if (!showAiForm) resetNewItem(); }}
                  className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAddItem}
                  className="px-8 py-2 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/10"
                >
                  Salvar Item
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {Object.entries(groupedStock).map(([category, items]) => (
          <div key={category} className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 ml-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              {category}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => (
                <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start mb-4 gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {item.image ? (
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 shrink-0 flex items-center justify-center text-slate-400">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 truncate">{item.name}</h4>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">{item.category}</p>
                        {inferStockUsageTags(item).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {inferStockUsageTags(item).map(tag => (
                              <span key={tag} className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 border border-blue-100">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteItem(item.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-2xl font-black text-slate-900">
                        {item.quantity} <span className="text-sm font-bold text-slate-400">{item.unit}</span>
                      </div>
                      <div className="text-[10px] font-bold uppercase mt-1 text-emerald-500">
                        Disponível para uso
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        -
                      </button>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  {item.notes && item.notes !== '-' && (
                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs leading-relaxed text-slate-600">
                      {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {stock.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Seu estoque está vazio.</p>
            <button 
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-emerald-600 font-bold hover:underline"
            >
              Adicionar primeiro item
            </button>
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
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Medidor de Luz IA</h2>
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
      const ai = getGeminiClient();
      const model = "gemini-2.5-flash";
      
      const prompt = "Analise esta foto de uma planta. Identifique se ela possui alguma praga, doença ou deficiência nutricional. Forneça o nome do problema, a causa provável e um tratamento detalhado (preferencialmente orgânico ou caseiro). Responda em Português do Brasil em formato JSON.";
      
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { data: base64Image.split(',')[1], mimeType: "image/jpeg" } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              problem: { type: Type.STRING, description: "Nome da praga ou doença" },
              cause: { type: Type.STRING, description: "Causa provável" },
              treatment: { type: Type.STRING, description: "Tratamento recomendado" },
              severity: { type: Type.STRING, description: "Nível de gravidade (Baixa, Média, Alta)" }
            },
            required: ["problem", "cause", "treatment", "severity"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError("Erro ao analisar a saúde da planta. Tente uma foto mais aproximada da área afetada.");
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
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Diagnóstico de Saúde IA</h2>
        <p className="text-slate-500">Identifique pragas e doenças tirando uma foto da parte afetada da planta.</p>
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

  const handleCapture = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        identifyPlant(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const identifyPlant = async (base64Image: string) => {
    setIdentifying(true);
    setError(null);
    setConfirmed(false);
    try {
      const ai = getGeminiClient();
      const model = 'gemini-2.5-flash';
      const stockContext = buildStockContext(stock);

      const prompt = `Identifique esta planta e devolva a ficha de cadastro completa em JSON, em Português do Brasil.

Escolha a melhor opção possível para todos os campos abaixo, priorizando materiais que já existem no estoque.
Quando realmente não for possível inferir algo pela foto, use exatamente "-".

Opções aceitas:
- status: ${PLANT_STATUS_OPTIONS.join(', ')}
- wateringFrequency: ${WATERING_OPTIONS.join(', ')}
- potSize: ${POT_OPTIONS.join(', ')}
- substrate: ${SUBSTRATE_OPTIONS.join(', ')}
- drainage: ${DRAINAGE_OPTIONS.join(', ')}
- filterMaterial: ${FILTER_OPTIONS.join(', ')}

Estoque atual: ${stockContext}.

Campos livres (podem receber "-" se não der para inferir): species, notes, substrateMix, drainageLayer.

No campo stockSuggestions, explique objetivamente por que a escolha combina com o estoque disponível e qual item usar primeiro.`;

      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'Nome comum da planta' },
              species: { type: Type.STRING, description: 'Nome científico ou -' },
              status: { type: Type.STRING, description: 'Status inicial da planta' },
              wateringFrequency: { type: Type.STRING, description: 'Frequência de rega (Diária, Semanal, Quinzenal ou Mensal)' },
              notes: { type: Type.STRING, description: 'Dica de cuidado ou -' },
              potSize: { type: Type.STRING, description: 'Tamanho de vaso sugerido' },
              substrate: { type: Type.STRING, description: 'Substrato principal sugerido' },
              substrateMix: { type: Type.STRING, description: 'Mistura complementar ou -' },
              drainage: { type: Type.STRING, description: 'Material principal de drenagem' },
              drainageLayer: { type: Type.STRING, description: 'Detalhe da camada de drenagem ou -' },
              filterMaterial: { type: Type.STRING, description: 'Material de filtragem sugerido' },
              stockSuggestions: { type: Type.STRING, description: 'Resumo do melhor uso do estoque para esta planta' }
            },
            required: ['name', 'species', 'status', 'wateringFrequency', 'notes', 'potSize', 'substrate', 'substrateMix', 'drainage', 'drainageLayer', 'filterMaterial', 'stockSuggestions']
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      setPlantData({
        name: normalizeChoice(data.name),
        species: normalizeChoice(data.species),
        status: (PLANT_STATUS_OPTIONS.includes(data.status) ? data.status : 'Saudável') as Plant['status'],
        wateringFrequency: WATERING_OPTIONS.includes(data.wateringFrequency) ? data.wateringFrequency : 'Semanal',
        notes: normalizeChoice(data.notes),
        potSize: matchSelectOption(data.potSize, POT_OPTIONS),
        substrate: matchSelectOption(data.substrate, SUBSTRATE_OPTIONS),
        substrateMix: normalizeChoice(data.substrateMix),
        drainage: matchSelectOption(data.drainage, DRAINAGE_OPTIONS),
        drainageLayer: normalizeChoice(data.drainageLayer),
        filterMaterial: matchSelectOption(data.filterMaterial, FILTER_OPTIONS),
        stockSuggestions: normalizeChoice(data.stockSuggestions),
      });
      try {
        const lightAnalysis = await analyzeLightWithAI(base64Image);
        setLightMeasurement(lightAnalysis);
      } catch (lightErr) {
        console.error(lightErr);
        setLightMeasurement(null);
      }
    } catch (err: any) {
      console.error(err);
      setError(getGeminiErrorMessage(err, 'Erro ao identificar a planta. Tente uma foto mais clara.'));
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
      isFavorite: false
    };

    addPlant(newPlant);
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
    };

    addPlant(newPlant);
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
        <p className="text-slate-500">Use IA por foto ou preencha manualmente o cadastro completo da planta.</p>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-fit mx-auto">
        <button
          onClick={() => setMode('ai')}
          className={`px-5 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'ai' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Identificar por foto
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
                    A IA tentou preencher toda a ficha. Quando não souber algo, deixe <b>-</b> ou ajuste manualmente antes de salvar.
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
              <label className="text-sm font-semibold text-slate-700">Nome da planta</label>
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
                name: '', species: UNKNOWN_OPTION, locationId: locations[0]?.id || '', status: 'Saudável', wateringFrequency: 'Semanal', notes: UNKNOWN_OPTION, potSize: UNKNOWN_OPTION, substrate: UNKNOWN_OPTION, drainage: UNKNOWN_OPTION, filterMaterial: UNKNOWN_OPTION, substrateMix: UNKNOWN_OPTION, drainageLayer: UNKNOWN_OPTION
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setApiKeyDraft(settings.geminiApiKey || getSavedGeminiKey() || '');
  }, [settings.geminiApiKey]);

  const handleImport = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      localStorage.setItem('atena_garden_full_data', JSON.stringify(parsed));
      if (parsed.settings) {
        localStorage.setItem('atena_garden_settings', JSON.stringify({ ...parsed.settings, geminiApiKey: '' }));
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
        localStorage.setItem('atena_garden_full_data', oldData);
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
          <p className="text-slate-500">Cole sua chave do Gemini aqui para liberar identificação, diagnóstico, medidor de luz, sementes e dicas do botânico IA sem depender de Firebase.</p>
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
                onClick={() => saveSettings({ ...settings, weatherMode: 'auto', geminiApiKey: apiKeyDraft.trim() || settings.geminiApiKey || '' })}
                className={`p-4 rounded-2xl border-2 transition-all text-left ${settings.weatherMode === 'auto' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
              >
                <div className="font-bold mb-1">Automático</div>
                <div className="text-xs opacity-70">Usa o GPS do seu dispositivo</div>
              </button>
              <button 
                onClick={() => saveSettings({ ...settings, weatherMode: 'manual', geminiApiKey: apiKeyDraft.trim() || settings.geminiApiKey || '' })}
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
                  value={settings.gardenAddress}
                  onChange={(e) => setSettings({ ...settings, gardenAddress: e.target.value })}
                />
                <button 
                  onClick={() => saveSettings({ ...settings, geminiApiKey: apiKeyDraft.trim() || settings.geminiApiKey || '' })}
                  className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-600 transition-colors"
                >
                  Salvar
                </button>
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

function SpecialistTips({ plants, locations, weather, forecast }: any) {
  const [tip, setTip] = useState<string>("Carregando dica personalizada...");
  const [details, setDetails] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const generateTip = async () => {
      if (plants.length === 0) {
        setTip("Adicione sua primeira planta para receber dicas personalizadas!");
        return;
      }

      setLoading(true);
      try {
        const ai = getGeminiClient();
        const model = "gemini-2.5-flash";
        
        const plantsInfo = plants.slice(0, 10).map((p: any) => {
          const loc = locations.find((l: any) => l.id === p.locationId)?.name || 'Desconhecido';
          return `${p.name} (${p.species || 'Espécie não informada'}) em ${loc}`;
        }).join(', ');

        const weatherInfo = weather ? `Clima atual: ${weather.temp}°C, ${weather.condition}.` : '';
        const forecastInfo = forecast ? `Previsão para amanhã: máxima ${forecast.tempMax}°C, mínima ${forecast.tempMin}°C, ${forecast.condition}.` : '';

        const prompt = `Você é um botânico especialista. Com base nestas plantas: ${plantsInfo}. E no clima: ${weatherInfo} ${forecastInfo}. 
        Dê uma dica resumida (máximo 150 caracteres) e uma explicação detalhada de cuidados para cada planta ou grupo de plantas. 
        Responda em JSON com os campos "summary" e "details".`;

        const response = await ai.models.generateContent({
          model,
          contents: [{ parts: [{ text: prompt }] }],
          config: { 
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                details: { type: Type.STRING }
              },
              required: ["summary", "details"]
            }
          }
        });

        const data = JSON.parse(response.text || "{}");
        setTip(data.summary || "Mantenha suas plantas hidratadas e observe sinais de pragas.");
        setDetails(data.details || null);
      } catch (error) {
        console.error("Erro ao gerar dica:", error);
        setTip(error instanceof Error && error.message === "missing-gemini-key" ? "Cadastre sua chave do Gemini em Configurações > IA para receber dicas personalizadas." : "Verifique a umidade do solo e garanta luz adequada para suas plantas.");
      } finally {
        setLoading(false);
      }
    };

    generateTip();
  }, [plants, locations, weather, forecast]);

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm h-full flex flex-col">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        <AlertCircle className="text-amber-500" /> Dicas do Especialista
      </h3>
      <div className="flex-1 flex flex-col">
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-900 leading-relaxed mb-4">
          {loading ? (
            <div className="flex items-center gap-2 text-amber-600 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin" /> Gerando dica personalizada...
            </div>
          ) : (
            `"${tip}"`
          )}
        </div>
        
        {details && !loading && (
          <div className="mt-auto">
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="text-amber-600 font-bold text-sm flex items-center gap-1 hover:underline"
            >
              {showDetails ? 'Ver menos' : 'Ver mais detalhes'}
              <ChevronRight className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
            </button>
            
            <AnimatePresence>
              {showDetails && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 p-4 bg-slate-50 rounded-2xl text-sm text-slate-600 border border-slate-100 whitespace-pre-wrap">
                    {details}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function PlantCard({ plant, location, locations = [], onWater, onUpdate, onRepot, onDelete }: { plant: Plant, location?: string, locations?: Location[], onWater?: (id: string) => void, onUpdate?: (p: Plant) => void, onRepot?: (id: string, details: any) => void, onDelete?: (id: string) => void, key?: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(plant);

  useEffect(() => {
    setEditData(plant);
  }, [plant]);


  const handleSave = () => {
    if (onUpdate) onUpdate(editData);
    setIsEditing(false);
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
      notes: `Identificado via IA. ${seedData.plantingInstructions}${seedData.warmWaterHydration ? `\n\nInstruções de Hidratação: ${seedData.hydrationInstructions}` : ''}`,
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
      const ai = getGeminiClient();
      const model = "gemini-2.5-flash";
      
      const stockList = stock.map(s => `${s.name} (${s.quantity} ${s.unit})`).join(", ");
      const prompt = `Identifique a semente nesta embalagem. Forneça instruções detalhadas de plantio (profundidade, espaçamento, luz e rega), além de técnicas práticas de germinação.
      Inclua técnicas como hidratação, escarificação, pré-resfriamento, uso de papel toalha, cobertura leve do substrato e umidade ideal, mas apenas quando realmente fizer sentido para a espécie.
      Além disso, veja a lista de materiais em estoque abaixo e sugira como usá-los para o plantio (ex: qual substrato usar, se precisa de fertilizante disponível, etc).
      Estoque atual: ${stockList || "Nenhum material em estoque"}.
      MUITO IMPORTANTE: Verifique se esta semente específica se beneficia de uma hidratação prévia com água morna (quebra de dormência). Se sim, forneça as instruções de como fazer.
      Responda em Português do Brasil em formato JSON.`;
      
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { data: base64Image.split(',')[1], mimeType: "image/jpeg" } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Nome da semente" },
              species: { type: Type.STRING, description: "Nome científico se possível" },
              plantingInstructions: { type: Type.STRING, description: "Instruções de plantio" },
              stockSuggestions: { type: Type.STRING, description: "Sugestões baseadas no estoque" },
              estimatedGerminationDays: { type: Type.NUMBER, description: "Dias estimados para germinação" },
              warmWaterHydration: { type: Type.BOOLEAN, description: "Se a semente se beneficia de hidratação com água morna" },
              hydrationInstructions: { type: Type.STRING, description: "Instruções de hidratação se aplicável" },
              germinationTechniques: { type: Type.STRING, description: "Técnicas de germinação recomendadas para esta semente" },
              recommendedLight: { type: Type.STRING, description: "Luz ideal para a germinação" },
              wateringTips: { type: Type.STRING, description: "Rega ideal durante a germinação" }
            },
            required: ["name", "plantingInstructions", "stockSuggestions", "estimatedGerminationDays", "warmWaterHydration", "germinationTechniques", "recommendedLight", "wateringTips"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      setSeedData(data);
    } catch (err: any) {
      console.error(err);
      setError(getGeminiErrorMessage(err, "Erro ao identificar a semente. Tente uma foto mais clara da embalagem."));
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
        <p className="text-slate-500">Identifique a embalagem e receba dicas personalizadas com base no seu estoque.</p>
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
                      <FlaskConical className="w-5 h-5 text-purple-500" /> Técnicas de Germinação por IA
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

