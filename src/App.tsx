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
}

interface Germination {
  id: string;
  name: string;
  startDate: string;
  expectedDays: number;
  status: 'Em andamento' | 'Sucesso' | 'Falha';
  notes?: string;
  lastWatered?: string;
  hydratedWithWarmWater?: boolean;
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

interface AppSettings {
  weatherMode: 'auto' | 'manual';
  gardenAddress: string;
  lat?: number;
  lng?: number;
  geminiApiKey?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [locations, setLocations] = useState<Location[]>([
    { id: '1', name: 'Varanda Principal', light: 'Sol Pleno', exposure: 'Norte' },
    { id: '2', name: 'Sacada Coberta', light: 'Meia Sombra', exposure: 'Leste' },
    { id: '3', name: 'Prateleira Interna', light: 'Luz Indireta', exposure: 'Interno' },
  ]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [stock, setStock] = useState<StockItem[]>([
    { id: '1', name: 'Terra Vegetal', quantity: 10, unit: 'kg', minQuantity: 2, category: 'Substratos & Solos' },
    { id: '2', name: 'Húmus de Minhoca', quantity: 5, unit: 'kg', minQuantity: 1, category: 'Substratos & Solos' },
    { id: '3', name: 'NPK 10-10-10', quantity: 500, unit: 'g', minQuantity: 100, category: 'Fertilizantes & Adubos' },
    { id: '4', name: 'Vaso de Barro G', quantity: 3, unit: 'un', minQuantity: 1, category: 'Vasos & Recipientes' },
    { id: '5', name: 'Tesoura de Poda', quantity: 1, unit: 'un', minQuantity: 1, category: 'Ferramentas' },
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
      if (data) {
        savedData = data;
        break;
      }
    }

    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
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
        if (stockList.length > 0) setStock(stockList.map((item: any) => ({ category: item.category || 'Insumos Gerais', ...item })));
        if (germinationsList.length > 0) setGerminations(germinationsList);
        if (tasksList.length > 0) setTasks(tasksList);
        if (historyList.length > 0) setHistory(historyList);
        if (locationsList.length > 0) setLocations(locationsList);
      } catch (e) {
        console.error("Error parsing recovered data", e);
      }
    } else {
      // Default data
      setPlants([
        { id: '1', name: 'Manjericão', species: 'Ocimum basilicum', locationId: '1', status: 'Saudável', wateringFrequency: 'Diária', lastWatered: new Date().toISOString(), potSize: 'Médio', substrateMix: 'Terra Vegetal + Húmus' },
        { id: '2', name: 'Lírio da Paz', species: 'Spathiphyllum', locationId: '3', status: 'Saudável', wateringFrequency: 'Semanal' },
        { id: '3', name: 'Babosa', species: 'Aloe vera', locationId: '2', status: 'Recuperação', wateringFrequency: 'Quinzenal' },
      ]);
      setStock([
        { id: '1', name: 'Terra Vegetal', quantity: 5, unit: 'kg', minQuantity: 2, category: 'Substratos & Solos' },
        { id: '2', name: 'Húmus de Minhoca', quantity: 1, unit: 'kg', minQuantity: 2, category: 'Substratos & Solos' },
      ]);
      setTasks([
        { id: '1', title: 'Adubar Manjericão', date: 'Hoje, 14:00', completed: false, plantId: '1' },
        { id: '2', title: 'Trocar vaso da Babosa', date: 'Amanhã', completed: false, plantId: '3' },
      ]);
    }

    const savedSettings = localStorage.getItem('atena_garden_settings');
    const localGeminiKey = getSavedGeminiKey();
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
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

  const filteredPlants = useMemo(() => {
    return plants.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.species?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [plants, searchQuery]);

  const stats = {
    total: plants.length,
    alerts: plants.filter(p => p.status === 'Problema' || p.status === 'Recuperação').length,
    wateringDue: plants.filter(p => !p.lastWatered).length,
    germinating: germinations.filter(g => g.status === 'Em andamento').length,
    lowStock: stock.filter(s => s.quantity <= s.minQuantity).length
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
          
          <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jardim</div>
          <SidebarLink icon={Sprout} label="Minhas Plantas" active={activeTab === 'plants'} onClick={() => setActiveTab('plants')} />
          <SidebarLink icon={MapPin} label="Ambientes" active={activeTab === 'places'} onClick={() => setActiveTab('places')} />
          <SidebarLink icon={FlaskConical} label="Sementes & Germinação" active={activeTab === 'seeds'} onClick={() => setActiveTab('seeds')} />
          <SidebarLink icon={StockIcon} label="Estoque" active={activeTab === 'stock'} onClick={() => setActiveTab('stock')} />
          
          <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ferramentas</div>
          <SidebarLink icon={Scan} label="Identificar Planta" active={activeTab === 'identify'} onClick={() => setActiveTab('identify')} />
          <SidebarLink icon={Bug} label="Diagnóstico IA" active={activeTab === 'diagnose'} onClick={() => setActiveTab('diagnose')} />
          <SidebarLink icon={Sun} label="Medidor de Luz" active={activeTab === 'light-meter'} onClick={() => setActiveTab('light-meter')} />
          
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 px-2 pt-3 pb-6 flex justify-around items-center z-[100] overflow-visible shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <MobileNavItem icon={LayoutDashboard} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <MobileNavItem icon={Sprout} active={activeTab === 'plants'} onClick={() => setActiveTab('plants')} />
        <div className="relative -top-10 px-1 overflow-visible">
          <button 
            onClick={() => setActiveTab('identify')}
            className={`w-18 h-18 rounded-full flex items-center justify-center text-white shadow-[0_8px_30px_rgba(16,185,129,0.4)] border-4 border-white transition-all active:scale-95 ${activeTab === 'identify' ? 'bg-emerald-600 scale-110' : 'bg-emerald-500'}`}
          >
            <Scan className="w-9 h-9" />
          </button>
        </div>
        <MobileNavItem icon={Bug} active={activeTab === 'diagnose'} onClick={() => setActiveTab('diagnose')} />
        <MobileNavItem icon={Settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
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
            <PlacesView locations={locations} plants={plants} />
          )}

          {activeTab === 'seeds' && (
            <SeedsView 
              stock={stock}
              germinations={germinations}
              onStartGermination={(g: Germination) => {
                setGerminations(prev => [g, ...prev]);
                setToast(`Germinação de "${g.name}" iniciada!`);
                setTimeout(() => setToast(null), 3000);
              }}
              addToHistory={addToHistory}
            />
          )}

          {activeTab === 'stock' && (
            <StockView stock={stock} setStock={setStock} />
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
              addToHistory={addToHistory}
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
              className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl z-[100] font-bold flex items-center gap-2"
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

function DashboardView({ weather, loadingWeather, fetchWeather, forecast, stats, filteredPlants, locations, setActiveTab, tasks, setWateringConfirmation, history, wateredToday }: any) {
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
              <StatRow label="Estoque Baixo" value={stats.lowStock} color="bg-red-500" />
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

function PlacesView({ locations, plants }: { locations: Location[], plants: Plant[] }) {
  const groupedLocations = locations.map(location => ({
    ...location,
    plants: plants.filter(plant => plant.locationId === location.id),
  }));

  return (
    <motion.div
      key="places"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Ambientes do Jardim</h2>
        <p className="text-slate-500">Veja rapidamente quantas plantas vivem em cada espaço e qual luz cada local recebe.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groupedLocations.map((location) => (
          <div key={location.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{location.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{location.light} • Exposição {location.exposure}</p>
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-bold">
                {location.plants.length} planta{location.plants.length === 1 ? '' : 's'}
              </div>
            </div>

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

function SeedsView({ stock, germinations, onStartGermination, addToHistory }: { stock: StockItem[], germinations: Germination[], onStartGermination: (g: Germination) => void, addToHistory: (item: any) => void }) {
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
        <GerminationView germinations={germinations} onNewPlanting={() => setView('identify')} />
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

function GerminationView({ germinations, onNewPlanting }: { germinations: Germination[], onNewPlanting?: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-700">Acompanhamento</h3>
        {onNewPlanting && (
          <button 
            onClick={onNewPlanting}
            className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo Plantio
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {germinations.map((g: any) => (
          <div key={g.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg">{g.name}</h3>
              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${g.status === 'Em andamento' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {g.status}
              </span>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between"><span>Início:</span> <b>{new Date(g.startDate).toLocaleDateString()}</b></div>
              <div className="flex justify-between"><span>Expectativa:</span> <b>{g.expectedDays} dias</b></div>
              {g.hydratedWithWarmWater && (
                <div className="flex items-center gap-2 mt-3 p-2 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-100">
                  <Droplets className="w-3 h-3" /> Hidratada com Água Morna
                </div>
              )}
            </div>
          </div>
        ))}
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

function StockView({ stock, setStock }: { stock: StockItem[], setStock: React.Dispatch<React.SetStateAction<StockItem[]>> }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: 0, unit: 'kg', minQuantity: 1, category: 'Substratos & Solos' });

  const categories = [
    'Substratos & Solos',
    'Fertilizantes & Adubos',
    'Vasos & Recipientes',
    'Ferramentas',
    'Sementes & Mudas',
    'Defensivos & Pragas',
    'Outros'
  ];

  const handleAddItem = () => {
    if (!newItem.name) return;
    const item: StockItem = {
      ...newItem,
      id: Math.random().toString(36).substr(2, 9)
    };
    setStock(prev => [...prev, item]);
    setShowAddForm(false);
    setNewItem({ name: '', quantity: 0, unit: 'kg', minQuantity: 1, category: 'Substratos & Solos' });
  };

  const deleteItem = (id: string) => {
    setStock(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setStock(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i));
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Estoque de Insumos</h2>
          <p className="text-slate-500">Gerencie seus materiais e receba alertas de reposição.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-5 h-5" /> Novo Item
        </button>
      </div>

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
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Categoria</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    value={newItem.category}
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
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Unidade</label>
                    <input 
                      type="text" 
                      placeholder="kg, g, un, L"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      value={newItem.unit}
                      onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowAddForm(false)}
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
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-slate-900">{item.name}</h4>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">{item.category}</p>
                    </div>
                    <button 
                      onClick={() => deleteItem(item.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-black text-slate-900">
                        {item.quantity} <span className="text-sm font-bold text-slate-400">{item.unit}</span>
                      </div>
                      <div className={`text-[10px] font-bold uppercase mt-1 ${item.quantity <= item.minQuantity ? 'text-red-500' : 'text-emerald-500'}`}>
                        {item.quantity <= item.minQuantity ? 'Reposição Necessária' : 'Estoque OK'}
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
                  
                  {item.quantity <= item.minQuantity && (
                    <div className="mt-4 p-2 bg-red-50 rounded-xl border border-red-100 flex items-center gap-2 text-red-600 text-[10px] font-bold">
                      <AlertCircle className="w-3 h-3" /> Nível crítico (Mín: {item.minQuantity}{item.unit})
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
      const ai = getGeminiClient();
      const model = "gemini-2.5-flash";
      
      const prompt = "Analise esta foto do local onde uma planta está. Estime o nível de luminosidade (Sol Pleno, Meia Sombra, Sombra ou Luz Indireta). Explique brevemente por que e dê uma dica de qual tipo de planta se daria bem aí. Responda em Português do Brasil em formato JSON.";
      
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
              level: { type: Type.STRING, description: "Nível de luz (ex: Sol Pleno)" },
              explanation: { type: Type.STRING, description: "Explicação curta" },
              tip: { type: Type.STRING, description: "Dica de planta" }
            },
            required: ["level", "explanation", "tip"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
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
          <b>Dica:</b> Para uma medição mais precisa, tire a foto no horário de maior incidência solar (geralmente entre 10h e 14h) e evite usar o flash.
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

function IdentifyPlantView({ addPlant, locations, addToHistory }: any) {
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [image, setImage] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [plantData, setPlantData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState(locations[0]?.id || '');
  const [confirmed, setConfirmed] = useState(false);
  const [manualPlant, setManualPlant] = useState<Partial<Plant>>({
    name: '',
    species: '',
    locationId: locations[0]?.id || '',
    status: 'Saudável',
    wateringFrequency: 'Semanal',
    notes: '',
    potSize: '',
    substrate: '',
    drainage: '',
    filterMaterial: '',
  });

  const substrateOptions = ['Terra vegetal', 'Terra + húmus', 'Substrato para folhagens', 'Substrato para suculentas', 'Terra + areia', 'Casca de pinus + perlita'];
  const drainageOptions = ['Sem drenagem extra', 'Argila expandida', 'Brita', 'Areia grossa', 'Carvão vegetal'];
  const filterOptions = ['Sem manta', 'Manta bidim', 'Tela plástica', 'Filtro de café'];
  const potOptions = ['Copo/mini vaso', 'Pequeno', 'Médio', 'Grande', 'Jardineira'];

  const resetAiState = () => {
    setImage(null);
    setPlantData(null);
    setConfirmed(false);
    setError(null);
  };

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

      const prompt = 'Identifique esta planta. Retorne o nome comum, nome científico (espécie), frequência de rega recomendada (Diária, Semanal, Quinzenal ou Mensal), e uma breve nota de cuidado. Responda em Português do Brasil em formato JSON.';

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
              species: { type: Type.STRING, description: 'Nome científico' },
              wateringFrequency: { type: Type.STRING, description: 'Frequência de rega (Diária, Semanal, Quinzenal ou Mensal)' },
              notes: { type: Type.STRING, description: 'Dica de cuidado' }
            },
            required: ['name', 'species', 'wateringFrequency', 'notes']
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      setPlantData(data);
    } catch (err: any) {
      console.error(err);
      setError(getGeminiErrorMessage(err, 'Erro ao identificar a planta. Tente uma foto mais clara.'));
    } finally {
      setIdentifying(false);
    }
  };

  const handleSave = () => {
    if (!plantData) return;

    const newPlant: Plant = {
      id: Math.random().toString(36).substr(2, 9),
      name: plantData.name,
      species: plantData.species,
      locationId: selectedLocation,
      status: 'Saudável',
      wateringFrequency: plantData.wateringFrequency,
      notes: plantData.notes,
      image: image || undefined,
      lastWatered: new Date().toISOString(),
      lastRepotted: '',
      potSize: '',
      substrateMix: '',
      drainageLayer: '',
      substrate: '',
      drainage: '',
      filterMaterial: '',
      isFavorite: false
    };

    addPlant(newPlant);
    addToHistory({
      type: 'Identificação',
      title: plantData.name,
      details: `Espécie: ${plantData.species}
Local: ${locations.find((l: any) => l.id === selectedLocation)?.name}`,
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
      species: manualPlant.species?.trim() || '',
      locationId: manualPlant.locationId || locations[0]?.id || '1',
      status: (manualPlant.status as Plant['status']) || 'Saudável',
      wateringFrequency: manualPlant.wateringFrequency || 'Semanal',
      notes: manualPlant.notes || '',
      image: manualPlant.image,
      lastWatered: manualPlant.lastWatered || '',
      lastRepotted: manualPlant.lastRepotted || '',
      potSize: manualPlant.potSize || '',
      substrate: manualPlant.substrate || '',
      drainage: manualPlant.drainage || '',
      filterMaterial: manualPlant.filterMaterial || '',
      substrateMix: manualPlant.substrateMix || '',
      drainageLayer: manualPlant.drainageLayer || '',
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
                    <span className="font-bold">Identificando espécie...</span>
                  </div>
                )}
              </div>

              {plantData && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nome Identificado</label>
                      <input
                        type="text"
                        value={plantData.name}
                        onChange={(e) => setPlantData({ ...plantData, name: e.target.value })}
                        className="w-full bg-transparent font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Espécie</label>
                      <input
                        type="text"
                        value={plantData.species}
                        onChange={(e) => setPlantData({ ...plantData, species: e.target.value })}
                        className="w-full bg-transparent font-medium text-slate-600 italic focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Onde ela vai ficar?</label>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full bg-transparent font-bold text-slate-900 focus:outline-none appearance-none"
                    >
                      {locations.map((l: any) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <label className="text-xs font-bold text-emerald-600 uppercase mb-1 block">Frequência de Rega</label>
                    <select
                      value={plantData.wateringFrequency}
                      onChange={(e) => setPlantData({ ...plantData, wateringFrequency: e.target.value })}
                      className="w-full bg-transparent font-bold text-emerald-900 focus:outline-none appearance-none"
                    >
                      <option value="Diária">Diária</option>
                      <option value="Semanal">Semanal</option>
                      <option value="Quinzenal">Quinzenal</option>
                      <option value="Mensal">Mensal</option>
                    </select>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <label className="text-xs font-bold text-blue-600 uppercase mb-1 block">Dica de Cuidado</label>
                    <textarea
                      value={plantData.notes}
                      onChange={(e) => setPlantData({ ...plantData, notes: e.target.value })}
                      className="w-full bg-transparent text-blue-900 focus:outline-none resize-none h-20"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    {!confirmed ? (
                      <button
                        onClick={handleSave}
                        className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Confirmar e Salvar
                      </button>
                    ) : (
                      <div className="flex-[2] py-4 bg-emerald-100 text-emerald-700 rounded-2xl font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> Salvo no Jardim
                      </div>
                    )}
                    <button
                      onClick={resetAiState}
                      className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                    >
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nome da planta</label>
              <input
                type="text"
                value={manualPlant.name || ''}
                onChange={(e) => setManualPlant({ ...manualPlant, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                placeholder="Ex: Babosa"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nome científico</label>
              <input
                type="text"
                value={manualPlant.species || ''}
                onChange={(e) => setManualPlant({ ...manualPlant, species: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                placeholder="Ex: Aloe vera"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Ambiente</label>
              <select
                value={manualPlant.locationId || locations[0]?.id || ''}
                onChange={(e) => setManualPlant({ ...manualPlant, locationId: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
              >
                {locations.map((location: any) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Status</label>
              <select
                value={manualPlant.status || 'Saudável'}
                onChange={(e) => setManualPlant({ ...manualPlant, status: e.target.value as Plant['status'] })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option>Saudável</option>
                <option>Recuperação</option>
                <option>Problema</option>
                <option>Muda</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Frequência de rega</label>
              <select
                value={manualPlant.wateringFrequency || 'Semanal'}
                onChange={(e) => setManualPlant({ ...manualPlant, wateringFrequency: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option>Diária</option>
                <option>Semanal</option>
                <option>Quinzenal</option>
                <option>Mensal</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Tamanho do vaso</label>
              <select
                value={manualPlant.potSize || ''}
                onChange={(e) => setManualPlant({ ...manualPlant, potSize: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="">Selecione</option>
                {potOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Material de filtragem</label>
              <select
                value={manualPlant.filterMaterial || ''}
                onChange={(e) => setManualPlant({ ...manualPlant, filterMaterial: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="">Selecione</option>
                {filterOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Substrato principal</label>
              <select
                value={manualPlant.substrate || ''}
                onChange={(e) => setManualPlant({ ...manualPlant, substrate: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="">Selecione</option>
                {substrateOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <input
                type="text"
                value={manualPlant.substrateMix || ''}
                onChange={(e) => setManualPlant({ ...manualPlant, substrateMix: e.target.value, substrate: manualPlant.substrate || 'Personalizado' })}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl"
                placeholder="Detalhes ou mistura personalizada"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Drenagem</label>
              <select
                value={manualPlant.drainage || ''}
                onChange={(e) => setManualPlant({ ...manualPlant, drainage: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="">Selecione</option>
                {drainageOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <input
                type="text"
                value={manualPlant.drainageLayer || ''}
                onChange={(e) => setManualPlant({ ...manualPlant, drainageLayer: e.target.value, drainage: manualPlant.drainage || 'Personalizada' })}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl"
                placeholder="Detalhes da camada de drenagem"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Observações</label>
            <textarea
              value={manualPlant.notes || ''}
              onChange={(e) => setManualPlant({ ...manualPlant, notes: e.target.value })}
              className="w-full h-28 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none"
              placeholder="Cuidados, histórico, origem da muda..."
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleManualSave}
              className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
            >
              Salvar planta manualmente
            </button>
            <button
              onClick={() => setManualPlant({
                name: '', species: '', locationId: locations[0]?.id || '', status: 'Saudável', wateringFrequency: 'Semanal', notes: '', potSize: '', substrate: '', drainage: '', filterMaterial: ''
              })}
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

function PlantCard({ plant, location, onWater, onUpdate, onRepot, onDelete }: { plant: Plant, location?: string, onWater?: (id: string) => void, onUpdate?: (p: Plant) => void, onRepot?: (id: string, details: any) => void, onDelete?: (id: string) => void, key?: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(plant);

  useEffect(() => {
    setEditData(plant);
  }, [plant]);

  const substrateOptions = ['Terra vegetal', 'Terra + húmus', 'Substrato para folhagens', 'Substrato para suculentas', 'Terra + areia', 'Casca de pinus + perlita'];
  const drainageOptions = ['Sem drenagem extra', 'Argila expandida', 'Brita', 'Areia grossa', 'Carvão vegetal'];
  const filterOptions = ['Sem manta', 'Manta bidim', 'Tela plástica', 'Filtro de café'];

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
                  <option>Saudável</option>
                  <option>Recuperação</option>
                  <option>Problema</option>
                  <option>Muda</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Rega</label>
                <select
                  value={editData.wateringFrequency}
                  onChange={e => setEditData({ ...editData, wateringFrequency: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option>Diária</option>
                  <option>Semanal</option>
                  <option>Quinzenal</option>
                  <option>Mensal</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Vaso</label>
                <input
                  type="text"
                  value={editData.potSize || ''}
                  onChange={e => setEditData({ ...editData, potSize: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  placeholder="Ex: Médio"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Filtragem</label>
                <select
                  value={editData.filterMaterial || ''}
                  onChange={e => setEditData({ ...editData, filterMaterial: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Selecione</option>
                  {filterOptions.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Substrato</label>
                <select
                  value={editData.substrate || ''}
                  onChange={e => setEditData({ ...editData, substrate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Selecione</option>
                  {substrateOptions.map(option => <option key={option} value={option}>{option}</option>)}
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
                  value={editData.drainage || ''}
                  onChange={e => setEditData({ ...editData, drainage: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Selecione</option>
                  {drainageOptions.map(option => <option key={option} value={option}>{option}</option>)}
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
      const prompt = `Identifique a semente nesta embalagem. Forneça instruções detalhadas de plantio (profundidade, espaçamento, luz, rega). 
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
              plantingInstructions: { type: Type.STRING, description: "Instruções de plantio" },
              stockSuggestions: { type: Type.STRING, description: "Sugestões baseadas no estoque" },
              estimatedGerminationDays: { type: Type.NUMBER, description: "Dias estimados para germinação" },
              warmWaterHydration: { type: Type.BOOLEAN, description: "Se a semente se beneficia de hidratação com água morna" },
              hydrationInstructions: { type: Type.STRING, description: "Instruções de hidratação se aplicável" }
            },
            required: ["name", "plantingInstructions", "stockSuggestions", "estimatedGerminationDays", "warmWaterHydration"]
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

