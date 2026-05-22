import { useState, useEffect, useCallback } from 'react';
import { 
  ChevronDown, 
  ChevronUp,
  RotateCcw, 
  Printer,
  Calculator
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

// Types
interface CalculationResult {
  socketBoxes: { count: number; cost: number; formula: string };
  grooves: { count: number; cost: number; formula: string; length: number };
  junctionBoxes: { count: number; cost: number; formula: string };
  cable: { count: number; cost: number; formula: string; length: number };
  panelModules: { count: number; cost: number; formula: string };
  panelInstallation: { cost: number; slots: number };
  lowVoltage: { count: number; cost: number; formula: string };
  total: number;
}

interface FormData {
  area: number;
  sockets: number;
  switches: number;
  lightPoints: number;
  lowVoltagePoints: number;
  panelLines: number;
  wiringType: 'hidden' | 'open';
}

// Constants
const PRICES = {
  socketBoxDrilling: 300,
  groove: 300,
  junctionBox: 550,
  cable: 150,
  panelModule: 350,
  wifiPoint: 900,
};

const COEFFS = {
  cableForSockets: 0.7,
  cableForSwitches: 1.0,
  groovePerLine: 1.7,
  cablePerArea: 2.8,
  cablePerLightPoint: 2.0,
  moduleToSlotRatio: 1.5,
};

const CABLE_INSTALL_PRICE_PER_METER = 150;
const CHASE_PRICE_PER_METER = 300;
const SWITCHES_PER_JUNCTION_BOX = 2;
const PANEL_LINES_PER_BOX_REDUCTION = 3;

const assetPath = (file: string) => `${import.meta.env.BASE_URL}images/${file}`;

// Format currency with spaces as thousand separators
const formatCurrency = (amount: number): string => {
  return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

// Calculate panel installation cost based on slots
const calculatePanelInstallation = (slots: number): number => {
  if (slots <= 12) return 3000;
  if (slots <= 24) return 4000;
  if (slots <= 36) return 5000;
  return 5000 + Math.ceil((slots - 36) / 12) * 1000;
};

// Main calculation function
const calculateEstimate = (data: FormData): CalculationResult => {
  const { area, sockets, switches, lightPoints, lowVoltagePoints, panelLines, wiringType } = data;

  // 1. Socket boxes (подрозетники)
  const socketBoxCount = sockets + switches + lowVoltagePoints;
  const socketBoxCost = socketBoxCount * PRICES.socketBoxDrilling;
  const socketBoxFormula = `${sockets} + ${switches} + ${lowVoltagePoints} = ${socketBoxCount} шт × ${PRICES.socketBoxDrilling} ₽`;

  // 2. Grooves (штробы)
  const cableLines = sockets * COEFFS.cableForSockets + switches * COEFFS.cableForSwitches;
  const lowVoltageChaseMeters = lowVoltagePoints * 2;
  const grooveLength = cableLines * COEFFS.groovePerLine + lowVoltageChaseMeters;
  const grooveMultiplier = wiringType === 'open' ? 0.4 : 1;
  const grooveCost = grooveLength * grooveMultiplier * CHASE_PRICE_PER_METER;
  const grooveFormula = `(${sockets}×${COEFFS.cableForSockets} + ${switches}×${COEFFS.cableForSwitches}) × ${COEFFS.groovePerLine} + ${lowVoltagePoints}×2 = ${grooveLength.toFixed(1)} м${wiringType === 'open' ? ' × 0.4' : ''} × ${CHASE_PRICE_PER_METER} ₽`;

  // 3. Junction boxes (распаячные коробки)
  const baseJunctionBoxes = Math.ceil(sockets / 5);
  const switchJunctionBoxes = Math.ceil(switches / SWITCHES_PER_JUNCTION_BOX);
  const lineBoxReduction = Math.floor(panelLines / PANEL_LINES_PER_BOX_REDUCTION);
  const junctionBoxCount = Math.max(0, baseJunctionBoxes + switchJunctionBoxes - lineBoxReduction);
  const junctionBoxCost = junctionBoxCount * PRICES.junctionBox;
  const junctionBoxFormula = `max(0, ⌈${sockets}/5⌉ + ⌈${switches}/${SWITCHES_PER_JUNCTION_BOX}⌉ - ⌊${panelLines}/${PANEL_LINES_PER_BOX_REDUCTION}⌋) = ${junctionBoxCount} шт × ${PRICES.junctionBox} ₽`;

  // 4. Cable (кабель)
  const cableLength = area * COEFFS.cablePerArea + lightPoints * COEFFS.cablePerLightPoint;
  const cableMultiplier = wiringType === 'open' ? 0.8 : 1;
  const cableCost = cableLength * cableMultiplier * CABLE_INSTALL_PRICE_PER_METER;
  const cableFormula = `(${area}×${COEFFS.cablePerArea} + ${lightPoints}×${COEFFS.cablePerLightPoint}) = ${cableLength.toFixed(0)} м${wiringType === 'open' ? ' × 0.8' : ''} × ${CABLE_INSTALL_PRICE_PER_METER} ₽`;

  // 5. Panel modules (модули щита)
  const moduleCount = 3 + panelLines;
  const moduleCost = moduleCount * PRICES.panelModule;
  const moduleFormula = `3 + ${panelLines} = ${moduleCount} мод × ${PRICES.panelModule} ₽`;

  // 6. Panel installation (монтаж щита)
  const slots = Math.ceil(moduleCount * COEFFS.moduleToSlotRatio);
  const panelInstallationCost = calculatePanelInstallation(slots);

  // 7. Low voltage (слаботочка)
  const lowVoltageCost = lowVoltagePoints * PRICES.wifiPoint;
  const lowVoltageFormula = `${lowVoltagePoints} × ${PRICES.wifiPoint} ₽`;

  const total = socketBoxCost + grooveCost + junctionBoxCost + cableCost + moduleCost + panelInstallationCost + lowVoltageCost;

  return {
    socketBoxes: { count: socketBoxCount, cost: socketBoxCost, formula: socketBoxFormula },
    grooves: { count: Math.ceil(grooveLength), cost: grooveCost, formula: grooveFormula, length: grooveLength },
    junctionBoxes: { count: junctionBoxCount, cost: junctionBoxCost, formula: junctionBoxFormula },
    cable: { count: Math.ceil(cableLength), cost: cableCost, formula: cableFormula, length: cableLength },
    panelModules: { count: moduleCount, cost: moduleCost, formula: moduleFormula },
    panelInstallation: { cost: panelInstallationCost, slots },
    lowVoltage: { count: lowVoltagePoints, cost: lowVoltageCost, formula: lowVoltageFormula },
    total,
  };
};

// Counter input component
interface CounterInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  image: string;
  unit?: string;
  placeholder?: string;
}

const CounterInput = ({ label, value, onChange, min = 0, max = 1000, image, unit, placeholder }: CounterInputProps) => {
  const increase = () => onChange(Math.min(value + 1, max));
  const decrease = () => onChange(Math.max(value - 1, min));
  
  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-3 text-sm font-medium text-neutral-700">
        <img src={image} alt="" className="w-7 h-7 object-contain opacity-100 contrast-125 saturate-125 shrink-0" />
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <button
          onClick={decrease}
          className="w-10 h-10 rounded-lg border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 flex items-center justify-center transition-all duration-200 active:scale-95"
          type="button"
        >
          <span className="text-lg text-neutral-500">−</span>
        </button>
        <div className="flex-1 relative">
          <Input
            type="number"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || 0)))}
            className="text-center font-medium text-base h-10 rounded-lg border-neutral-200 focus:border-neutral-400 focus:ring-0"
          />
          {unit && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">{unit}</span>
          )}
        </div>
        <button
          onClick={increase}
          className="w-10 h-10 rounded-lg border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 flex items-center justify-center transition-all duration-200 active:scale-95"
          type="button"
        >
          <span className="text-lg text-neutral-500">+</span>
        </button>
      </div>
    </div>
  );
};

// Print-only estimate component
const PrintEstimate = ({ result, formData }: { result: CalculationResult; formData: FormData }) => {
  const date = new Date().toLocaleDateString('ru-RU');
  const shieldTotal = result.panelModules.cost + result.panelInstallation.cost;
  
  return (
    <div className="print-only hidden print:block p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8 pb-6 border-b-2 border-neutral-800">
        <h1 className="text-2xl font-bold text-neutral-900 uppercase tracking-wide">
          Смета электромонтажных работ
        </h1>
        <p className="text-sm text-neutral-600 mt-2">Дата составления: {date}</p>
      </div>
      
      {/* Input Parameters */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4 border-b border-neutral-300 pb-1">
          Исходные данные
        </h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-600">Площадь помещения:</span>
            <span className="font-medium">{formData.area} м²</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-600">Розетки 220В:</span>
            <span className="font-medium">{formData.sockets} шт</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-600">Выключатели:</span>
            <span className="font-medium">{formData.switches} шт</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-600">Световые точки:</span>
            <span className="font-medium">{formData.lightPoints} шт</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-600">Слаботочка:</span>
            <span className="font-medium">{formData.lowVoltagePoints} точек</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-600">Линии на щит:</span>
            <span className="font-medium">{formData.panelLines}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-600">Тип прокладки:</span>
            <span className="font-medium">{formData.wiringType === 'hidden' ? 'Скрытая' : 'Открытая'}</span>
          </div>
        </div>
      </div>
      
      {/* Estimate Table */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4 border-b border-neutral-300 pb-1">
          Расчёт стоимости
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-400">
              <th className="text-left py-2 font-semibold text-neutral-900">№</th>
              <th className="text-left py-2 font-semibold text-neutral-900">Наименование работ</th>
              <th className="text-left py-2 font-semibold text-neutral-900">Формула расчёта</th>
              <th className="text-center py-2 font-semibold text-neutral-900">Кол-во</th>
              <th className="text-right py-2 font-semibold text-neutral-900">Сумма, ₽</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-neutral-200">
              <td className="py-2 text-neutral-600">1</td>
              <td className="py-2">Подрозетники (высверливание и установка)</td>
              <td className="py-2 text-neutral-500 font-mono text-xs">{result.socketBoxes.formula}</td>
              <td className="py-2 text-center">{result.socketBoxes.count} шт</td>
              <td className="py-2 text-right font-medium">{formatCurrency(result.socketBoxes.cost)}</td>
            </tr>
            <tr className="border-b border-neutral-200">
              <td className="py-2 text-neutral-600">2</td>
              <td className="py-2">{formData.wiringType === 'hidden' ? 'Штробы в стенах' : 'Укладка по стене'}</td>
              <td className="py-2 text-neutral-500 font-mono text-xs">{result.grooves.formula}</td>
              <td className="py-2 text-center">{Math.round(result.grooves.length)} м</td>
              <td className="py-2 text-right font-medium">{formatCurrency(result.grooves.cost)}</td>
            </tr>
            <tr className="border-b border-neutral-200">
              <td className="py-2 text-neutral-600">3</td>
              <td className="py-2">Распаячные коробки (установка)</td>
              <td className="py-2 text-neutral-500 font-mono text-xs">{result.junctionBoxes.formula}</td>
              <td className="py-2 text-center">{result.junctionBoxes.count} шт</td>
              <td className="py-2 text-right font-medium">{formatCurrency(result.junctionBoxes.cost)}</td>
            </tr>
            <tr className="border-b border-neutral-200">
              <td className="py-2 text-neutral-600">4</td>
              <td className="py-2">Монтаж кабеля</td>
              <td className="py-2 text-neutral-500 font-mono text-xs">{result.cable.formula}</td>
              <td className="py-2 text-center">{Math.round(result.cable.length)} м</td>
              <td className="py-2 text-right font-medium">{formatCurrency(result.cable.cost)}</td>
            </tr>
            <tr className="border-b border-neutral-200">
              <td className="py-2 text-neutral-600">5</td>
              <td className="py-2">Сборка и монтаж щита</td>
              <td className="py-2 text-neutral-500 font-mono text-xs">{result.panelModules.formula}</td>
              <td className="py-2 text-center">{result.panelModules.count} мод / {result.panelInstallation.slots} мест</td>
              <td className="py-2 text-right font-medium">{formatCurrency(shieldTotal)}</td>
            </tr>
            <tr className="border-b border-neutral-200">
              <td className="py-2 text-neutral-600">6</td>
              <td className="py-2">Слаботочка (интернет/TV/сигнализация)</td>
              <td className="py-2 text-neutral-500 font-mono text-xs">{result.lowVoltage.formula}</td>
              <td className="py-2 text-center">{result.lowVoltage.count} точек</td>
              <td className="py-2 text-right font-medium">{formatCurrency(result.lowVoltage.cost)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-neutral-800">
              <td colSpan={4} className="py-4 text-right font-bold text-neutral-900 uppercase">
                Итого:
              </td>
              <td className="py-4 text-right font-bold text-lg">{formatCurrency(result.total)} ₽</td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      {/* Footer */}
      <div className="mt-12 pt-4 border-t border-neutral-300 text-xs text-neutral-500">
        <p>Расчёт основан на средних рыночных ценах. Фактическая стоимость может отличаться.</p>
        <p className="mt-1">Калькулятор сметы электромонтажных работ • {date}</p>
      </div>
    </div>
  );
};

function App() {
  const [formData, setFormData] = useState<FormData>({
    area: 70,
    sockets: 30,
    switches: 17,
    lightPoints: 15,
    lowVoltagePoints: 5,
    panelLines: 10,
    wiringType: 'hidden',
  });
  
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Calculate on form change
  useEffect(() => {
    const newResult = calculateEstimate(formData);
    setResult(newResult);
  }, [formData]);

  // Handle reset
  const handleReset = () => {
    setFormData({
      area: 70,
      sockets: 30,
      switches: 17,
      lightPoints: 15,
      lowVoltagePoints: 5,
      panelLines: 10,
      wiringType: 'hidden',
    });
    setShowDetails(false);
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Update form field
  const updateField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  if (!result) return null;

  const shieldTotal = result.panelModules.cost + result.panelInstallation.cost;

  return (
    <>
      {/* Print-only estimate */}
      <PrintEstimate result={result} formData={formData} />
      
      {/* Main app - hidden when printing */}
      <div className="min-h-screen bg-white print:hidden">
        {/* Header */}
        <header className="border-b border-neutral-100">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-neutral-900 flex items-center justify-center">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">
                  Смета электромонтажа
                </h1>
                <p className="text-sm text-neutral-500">
                  Расчёт стоимости работ и материалов
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-8">
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left Column - Inputs */}
            <div className="lg:col-span-7 space-y-6">
              {/* Room Parameters */}
              <section>
                <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                  Параметры помещения
                </h2>
                <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-100">
                      <CounterInput
                        label="Площадь помещения"
                        value={formData.area}
                        onChange={(v) => updateField('area', v)}
                        min={20}
                        max={500}
                        image={assetPath('home-v2.png')}
                        unit="м²"
                      />
                </div>
              </section>

              {/* Electrical Points */}
              <section>
                <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                  Электроточки
                </h2>
                <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <CounterInput
                      label="Розетки 220В"
                      value={formData.sockets}
                      onChange={(v) => updateField('sockets', v)}
                      max={100}
                      image={assetPath('socket-v2.png')}
                      unit="шт"
                    />
                    <CounterInput
                      label="Выключатели"
                      value={formData.switches}
                      onChange={(v) => updateField('switches', v)}
                      max={50}
                      image={assetPath('switch-v2.png')}
                      unit="шт"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <CounterInput
                      label="Световые точки"
                      value={formData.lightPoints}
                      onChange={(v) => updateField('lightPoints', v)}
                      max={50}
                      image={assetPath('light-v2.png')}
                      unit="шт"
                    />
                    <CounterInput
                      label="Слаботочка"
                      value={formData.lowVoltagePoints}
                      onChange={(v) => updateField('lowVoltagePoints', v)}
                      max={20}
                      image={assetPath('wifi-v2.png')}
                      unit="точек"
                    />
                    <CounterInput
                      label="Количество линий на щит"
                      value={formData.panelLines}
                      onChange={(v) => updateField('panelLines', v)}
                      max={200}
                      image={assetPath('cable-v2.png')}
                      unit="линий"
                      placeholder="Например: 12"
                    />
                  </div>
                </div>
              </section>

              {/* Wiring Type */}
              <section>
                <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                  Тип прокладки
                </h2>
                <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-100">
                  <RadioGroup
                    value={formData.wiringType}
                    onValueChange={(v) => updateField('wiringType', v as 'hidden' | 'open')}
                    className="flex flex-col sm:flex-row gap-3"
                  >
                    <div className="flex-1">
                      <RadioGroupItem
                        value="hidden"
                        id="hidden"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="hidden"
                        className="flex items-center gap-3 p-4 rounded-xl border border-neutral-200 cursor-pointer transition-all duration-200 peer-data-[state=checked]:border-neutral-900 peer-data-[state=checked]:bg-white hover:border-neutral-300 bg-white"
                      >
                        <div className="w-4 h-4 rounded-full border-2 border-neutral-300 peer-data-[state=checked]:border-neutral-900 peer-data-[state=checked]:bg-neutral-900 relative">
                          <div className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-white opacity-0 peer-data-[state=checked]:opacity-100" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 text-sm">Скрытая проводка</p>
                          <p className="text-xs text-neutral-500">Штробы в стенах</p>
                        </div>
                      </Label>
                    </div>
                    <div className="flex-1">
                      <RadioGroupItem
                        value="open"
                        id="open"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="open"
                        className="flex items-center gap-3 p-4 rounded-xl border border-neutral-200 cursor-pointer transition-all duration-200 peer-data-[state=checked]:border-neutral-900 peer-data-[state=checked]:bg-white hover:border-neutral-300 bg-white"
                      >
                        <div className="w-4 h-4 rounded-full border-2 border-neutral-300 peer-data-[state=checked]:border-neutral-900 peer-data-[state=checked]:bg-neutral-900 relative">
                          <div className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-white opacity-0 peer-data-[state=checked]:opacity-100" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 text-sm">Открытая проводка</p>
                          <p className="text-xs text-neutral-500">Укладка по стене</p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                  {formData.wiringType === 'open' && (
                    <div className="mt-4 p-3 rounded-lg bg-neutral-100">
                      <p className="text-sm text-neutral-600">
                        <span className="font-medium">Экономия:</span> укладка по стене дешевле на 40-60%
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column - Results */}
            <div className="lg:col-span-5">
              <div className="sticky top-6">
                {/* Total Cost */}
                <div className="p-6 rounded-2xl bg-neutral-900 text-white mb-4">
                  <p className="text-sm text-neutral-400 mb-2">Итоговая стоимость</p>
                  <p className="text-4xl font-semibold tracking-tight">
                    {formatCurrency(result.total)}
                    <span className="text-xl text-neutral-400 ml-1">₽</span>
                  </p>
                </div>

                {/* Metrics */}
                <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-100 mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <img src={assetPath('socket-v2.png')} alt="" className="w-8 h-8 object-contain opacity-100 contrast-125 saturate-125" />
                      <div>
                        <p className="text-xs text-neutral-400">Точек</p>
                        <p className="font-medium text-neutral-900">{result.socketBoxes.count}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <img src={assetPath('cable-v2.png')} alt="" className="w-8 h-8 object-contain opacity-100 contrast-125 saturate-125" />
                      <div>
                        <p className="text-xs text-neutral-400">Кабель</p>
                        <p className="font-medium text-neutral-900">{Math.round(result.cable.length)} м</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mb-4">
                  <Button
                    onClick={() => setShowDetails(!showDetails)}
                    variant="outline"
                    className="flex-1 rounded-xl h-11 border-neutral-200 hover:bg-neutral-50"
                  >
                    {showDetails ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-2" />
                        Скрыть
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-2" />
                        Детали
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="h-11 px-4 rounded-xl border-neutral-200 hover:bg-neutral-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    className="h-11 px-4 rounded-xl border-neutral-200 hover:bg-neutral-50"
                  >
                    <Printer className="w-4 h-4" />
                  </Button>
                </div>

                {/* Details */}
                <div className={cn(
                  "overflow-hidden transition-all duration-300",
                  showDetails ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
                )}>
                  <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-100">
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                      Детализация
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-neutral-200">
                        <span className="text-sm text-neutral-600">Подрозетники</span>
                        <span className="font-medium text-neutral-900">{formatCurrency(result.socketBoxes.cost)} ₽</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-neutral-200">
                        <span className="text-sm text-neutral-600">
                          {formData.wiringType === 'hidden' ? 'Штробы' : 'Укладка по стене'}
                        </span>
                        <span className="font-medium text-neutral-900">{formatCurrency(result.grooves.cost)} ₽</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-neutral-200">
                        <span className="text-sm text-neutral-600">Распаячные коробки</span>
                        <span className="font-medium text-neutral-900">{formatCurrency(result.junctionBoxes.cost)} ₽</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-neutral-200">
                        <span className="text-sm text-neutral-600">Монтаж кабеля</span>
                        <span className="font-medium text-neutral-900">{formatCurrency(result.cable.cost)} ₽</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-neutral-200">
                        <span className="text-sm text-neutral-600">Сборка и монтаж щита</span>
                        <span className="font-medium text-neutral-900">{formatCurrency(shieldTotal)} ₽</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-neutral-200">
                        <span className="text-sm text-neutral-600">Слаботочка</span>
                        <span className="font-medium text-neutral-900">{formatCurrency(result.lowVoltage.cost)} ₽</span>
                      </div>
                      <div className="flex justify-between items-center pt-3">
                        <span className="font-semibold text-neutral-900">Итого</span>
                        <span className="font-bold text-lg text-neutral-900">{formatCurrency(result.total)} ₽</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-neutral-100 mt-12">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <p className="text-xs text-neutral-400 text-center">
              Расчёт основан на средних рыночных ценах. Фактическая стоимость может отличаться.
            </p>
          </div>
        </footer>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            margin: 1.5cm;
            size: A4;
          }
          
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-only {
            display: block !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

export default App;

