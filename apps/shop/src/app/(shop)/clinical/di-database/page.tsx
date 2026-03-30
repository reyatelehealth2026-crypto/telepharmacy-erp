'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  Pill,
  AlertTriangle,
  Shield,
  FileText,
  ChevronDown,
  ChevronUp,
  Heart,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface DrugInfo {
  name: string;
  genericName: string;
  classification: string;
  indications: string[];
  dosage: string;
  sideEffects: string[];
  contraindications: string[];
  warnings: string[];
  interactions: string[];
  pregnancyCategory: string;
}

const MOCK_DRUGS: DrugInfo[] = [
  {
    name: 'Metformin 500mg',
    genericName: 'Metformin Hydrochloride',
    classification: 'Antidiabetic (Biguanide)',
    indications: ['เบาหวานชนิดที่ 2', 'ป้องกันเบาหวานในผู้ป่วย prediabetes'],
    dosage: 'เริ่มต้น 500mg 2 ครั้ง/วัน หลังอาหาร เพิ่มเป็น 1000mg 2 ครั้ง/วัน',
    sideEffects: ['คลื่นไส้', 'ท้องเสีย', 'กลิ่นปากเหมือนโลหะ', 'วิงเวียนหัวใจเต้นเร็ว (lactic acidosis - หายาก)'],
    contraindications: ['โรคไตขั้นรุนแรง', 'โรคตับรุนแรง', 'lactic acidosis', 'การฉีดสารทึบรังสี'],
    warnings: ['หยุดยาก่อนผ่าตัด 48 ชม.', 'เฝ้าระวังระดับ B12', 'ระวัง hypoglycemia ร่วมกับยาอื่น'],
    interactions: ['ยาขับปัสสาวะ', 'สเตียรอยด์', 'beta-blocker (ปกปิดอาการ hypoglycemia)'],
    pregnancyCategory: 'B',
  },
  {
    name: 'Amlodipine 5mg',
    genericName: 'Amlodipine Besylate',
    classification: 'Calcium Channel Blocker',
    indications: ['ความดันโลหิตสูง', 'อาการเจ็บหน้าอก (angina)'],
    dosage: '5-10mg วันละครั้ง',
    sideEffects: ['บวมที่เท้า', 'ใจสั่น', 'ปวดศีรษะ', 'คลื่นไส้'],
    contraindications: ['shock cardiogenic', 'หัวใจล้มเหลวรุนแรง'],
    warnings: ['เริ่มยาช้าในผู้สูงอายุ', 'เฝ้าระวัง angioedema'],
    interactions: ['Simvastatin (จำกัดขนาด ≤20mg)', 'CYP3A4 inhibitors'],
    pregnancyCategory: 'C',
  },
];

function DIDatabasePageInner() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<DrugInfo[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<DrugInfo | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['indications']);

  useEffect(() => {
    if (initialQuery) {
      handleSearch();
    }
  }, [initialQuery]);

  const handleSearch = () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    // Mock search
    const filtered = MOCK_DRUGS.filter(
      (d) =>
        d.name.toLowerCase().includes(query.toLowerCase()) ||
        d.genericName.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
    setSelectedDrug(null);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  return (
    <div className="pb-20">
      <div className="sticky top-14 z-30 bg-background px-4 pb-3 pt-3 border-b">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/clinical" className="rounded-full p-1 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold">Drug Information</h1>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="ค้นหาชื่อยา..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            className="rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            ค้นหา
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Results */}
        {!selectedDrug && results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">ผลการค้นหา ({results.length})</p>
            {results.map((drug) => (
              <button
                key={drug.name}
                onClick={() => setSelectedDrug(drug)}
                className="w-full rounded-xl border p-3 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-primary" />
                  <span className="font-medium">{drug.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{drug.genericName}</p>
                <Badge variant="secondary" className="mt-2 text-[10px]">
                  {drug.classification}
                </Badge>
              </button>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!selectedDrug && results.length === 0 && query && (
          <div className="text-center py-8">
            <Search className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">ไม่พบข้อมูล</p>
          </div>
        )}

        {/* Drug Detail */}
        {selectedDrug && (
          <div className="space-y-3">
            <button
              onClick={() => setSelectedDrug(null)}
              className="text-xs text-primary flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              กลับไปผลการค้นหา
            </button>

            {/* Header */}
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" />
                <h2 className="font-bold">{selectedDrug.name}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{selectedDrug.genericName}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="secondary">{selectedDrug.classification}</Badge>
                <Badge variant="outline">Pregnancy {selectedDrug.pregnancyCategory}</Badge>
              </div>
            </div>

            {/* Sections */}
            {[
              { id: 'indications', label: 'ข้อบ่งใช้', icon: FileText, items: selectedDrug.indications },
              { id: 'dosage', label: 'ขนาดใช้', icon: Pill, items: [selectedDrug.dosage] },
              { id: 'sideEffects', label: 'ผลข้างเคียง', icon: AlertTriangle, items: selectedDrug.sideEffects, warning: true },
              { id: 'contraindications', label: 'ข้อห้ามใช้', icon: Shield, items: selectedDrug.contraindications, danger: true },
              { id: 'interactions', label: 'ปฏิกิริยาระหว่างยา', icon: Heart, items: selectedDrug.interactions },
            ].map((section) => {
              const Icon = section.icon;
              const isExpanded = expandedSections.includes(section.id);
              return (
                <div key={section.id} className="rounded-xl border overflow-hidden">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${section.warning ? 'text-amber-500' : section.danger ? 'text-red-500' : 'text-primary'}`} />
                      <span className="font-medium text-sm">{section.label}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className={`border-t px-3 py-3 ${section.warning ? 'bg-amber-50' : section.danger ? 'bg-red-50' : ''}`}>
                      <ul className="space-y-1">
                        {section.items.map((item, i) => (
                          <li
                            key={i}
                            className={`text-sm ${section.warning ? 'text-amber-700' : section.danger ? 'text-red-700' : 'text-muted-foreground'}`}
                          >
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Disclaimer */}
            <div className="rounded-lg bg-muted p-3">
              <p className="text-[10px] text-muted-foreground">
                ข้อมูลนี้เป็นข้อมูลทั่วไปเพื่อการศึกษา ผู้ใช้ควรปรึกษาเภสัชกรหรือแพทย์ก่อนใช้ยา
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DIDatabasePage() {
  return (
    <Suspense>
      <DIDatabasePageInner />
    </Suspense>
  );
}
