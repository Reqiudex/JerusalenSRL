import React, { useState } from 'react';
import { 
  GitBranch, 
  Syringe, 
  Calendar, 
  DollarSign, 
  PlusCircle, 
  ShieldCheck, 
  Search, 
  Filter, 
  Layers, 
  Activity, 
  FileSpreadsheet, 
  FileDown, 
  CheckCircle2, 
  AlertTriangle,
  Award,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Heart
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function CattleManagement({ cattleList, onAddAnimal, onUpdateAnimal }) {
  const [selectedAnimal, setSelectedAnimal] = useState(cattleList[0]);
  const [activeSubTab, setActiveSubTab] = useState('list'); // 'list' | 'detail' | 'new-animal' | 'vaccines' | 'auctions'
  const [filterBreed, setFilterBreed] = useState('Todos');
  const [filterCategory, setFilterCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Form for New Animal
  const [newBov, setNewBov] = useState({
    name: '',
    earringNumber: '',
    hbp: '',
    breed: 'Nelore Mocho PO',
    category: 'Toro Reproductor',
    gender: 'Macho',
    birthDate: '2024-01-10',
    weightKg: 650,
    status: 'Activo',
    location: 'Cabaña El Palmar - Piquete 1',
    auctionHouse: 'Fexpocruz Remates',
    purchaseDate: '2025-05-10',
    totalPriceUsd: 12000,
    installmentsCount: 12,
    installmentsPaid: 4,
    sellerCabaña: 'Cabaña Sausalito',
    fatherName: 'Kayack FIV',
    fatherOrigin: 'Brasil 🇧🇷',
    motherName: 'Doce da Carpa',
    motherOrigin: 'Brasil 🇧🇷',
    method: 'Inseminación Artificial (IATF)',
    lastInseminationDate: '2026-08-15',
    strawsInStock: 50
  });

  // Calculations
  const totalAnimals = cattleList.length;
  const totalBulls = cattleList.filter(c => c.gender === 'Macho').length;
  const totalCows = cattleList.filter(c => c.gender === 'Hembra').length;
  const totalPortfolioValueUsd = cattleList.reduce((acc, c) => acc + (c.auctionData?.totalPriceUsd || 0), 0);
  const totalStrawsStock = cattleList.reduce((acc, c) => acc + (c.reproduction?.strawsInStock || 0), 0);
  const pregnantCount = cattleList.filter(c => c.status?.toLowerCase().includes('preñada') || c.status?.toLowerCase().includes('gestante')).length;

  const filteredCattle = cattleList.filter(c => {
    const matchBreed = filterBreed === 'Todos' || c.breed.includes(filterBreed);
    const matchCat = filterCategory === 'Todos' || c.category.includes(filterCategory);
    const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.earringNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.breed.toLowerCase().includes(searchQuery.toLowerCase());
    return matchBreed && matchCat && matchSearch;
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newBov.name || !newBov.earringNumber) {
      alert('Por favor complete el nombre y número de caravana/arete.');
      return;
    }

    const created = {
      id: `BOV-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newBov.name,
      earringNumber: newBov.earringNumber,
      hbp: newBov.hbp || `BOL-GEN-${Math.floor(1000 + Math.random() * 9000)}`,
      breed: newBov.breed,
      category: newBov.category,
      gender: newBov.gender,
      birthDate: newBov.birthDate,
      weightKg: parseFloat(newBov.weightKg || 600),
      status: newBov.status,
      location: newBov.location,
      auctionData: {
        auctionHouse: newBov.auctionHouse,
        purchaseDate: newBov.purchaseDate,
        totalPriceUsd: parseFloat(newBov.totalPriceUsd),
        totalPriceBs: parseFloat(newBov.totalPriceUsd) * 6.96,
        installmentsCount: parseInt(newBov.installmentsCount),
        installmentValueUsd: parseFloat(newBov.totalPriceUsd) / parseInt(newBov.installmentsCount || 1),
        installmentsPaid: parseInt(newBov.installmentsPaid || 1),
        sellerCabaña: newBov.sellerCabaña
      },
      pedigree: {
        father: { name: newBov.fatherName, reg: 'REG-F-881', origin: newBov.fatherOrigin, notes: 'Padre Verificado' },
        mother: { name: newBov.motherName, reg: 'REG-M-441', origin: newBov.motherOrigin, notes: 'Madre Verificada' },
        paternalGrandfather: { name: 'Abuelo Paterno Élite', reg: 'REG-AP' },
        paternalGrandmother: { name: 'Abuela Paterna Élite', reg: 'REG-BP' },
        maternalGrandfather: { name: 'Abuelo Materno Élite', reg: 'REG-AM' },
        maternalGrandmother: { name: 'Abuela Materna Élite', reg: 'REG-BM' }
      },
      reproduction: {
        method: newBov.method,
        lastInseminationDate: newBov.lastInseminationDate,
        strawsInStock: parseInt(newBov.strawsInStock || 0),
        strawPriceUsd: 30,
        pregnancyConfirmedCount: 5
      },
      vaccines: [
        { name: 'Fiebre Aftosa Bivalente', applicationDate: '2026-05-10', nextDueDate: '2026-11-10', lot: 'AFT-2026', vet: 'SENASAG Oficial' },
        { name: 'Clostridiosis Bovina 10 Vías', applicationDate: '2026-06-15', nextDueDate: '2027-06-15', lot: 'CLS-990', vet: 'Veterinario Cabaña' }
      ],
      image: newBov.gender === 'Macho'
        ? 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=800&q=80'
        : 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=800&q=80'
    };

    onAddAnimal(created);
    setSelectedAnimal(created);
    setActiveSubTab('detail');
    alert('¡Animal registrado con éxito en el sistema ganadero!');
  };

  const handleExportCattleExcel = () => {
    const data = cattleList.map(c => ({
      'Código': c.id,
      'Nombre': c.name,
      'Caravana / Arete': c.earringNumber,
      'HBP Registro': c.hbp,
      'Raza': c.breed,
      'Categoría': c.category,
      'Sexo': c.gender,
      'Peso (Kg)': c.weightKg,
      'Estado': c.status,
      'Ubicación / Piquete': c.location,
      'Subasta de Compra': c.auctionData?.auctionHouse,
      'Fecha Compra': c.auctionData?.purchaseDate,
      'Precio Compra (USD)': c.auctionData?.totalPriceUsd,
      'Cuotas Totales': c.auctionData?.installmentsCount,
      'Cuotas Pagadas': c.auctionData?.installmentsPaid,
      'Valor Cuota (USD)': c.auctionData?.installmentValueUsd,
      'Saldo Pendiente (USD)': (c.auctionData?.installmentsCount - c.auctionData?.installmentsPaid) * c.auctionData?.installmentValueUsd,
      'Padre': c.pedigree?.father?.name,
      'Madre': c.pedigree?.mother?.name,
      'Pajuelas Semen Stock': c.reproduction?.strawsInStock || 0,
      'Última Inseminación': c.reproduction?.lastInseminationDate || 'N/A'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Hato Bovino');
    XLSX.writeFile(wb, `Gestion_Ganadera_Hato_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportCattlePDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    // Header
    doc.setFillColor(18, 20, 26);
    doc.rect(0, 0, 297, 28, 'F');
    doc.setTextColor(243, 229, 171);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('SISTEMA DE GESTIÓN GANADERA & GENÉTICA BOVINA', 14, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 220, 220);
    doc.text(`Informe de Hato, Pedigrí, Subastas y Control Reproductivo | Emitido: ${new Date().toLocaleDateString()}`, 14, 20);

    const rows = cattleList.map(c => [
      c.earringNumber,
      c.name,
      c.breed,
      c.category,
      `${c.weightKg} kg`,
      `$${c.auctionData?.totalPriceUsd?.toLocaleString()} USD`,
      `${c.auctionData?.installmentsPaid}/${c.auctionData?.installmentsCount} cuotas`,
      c.reproduction?.lastInseminationDate || 'N/A',
      c.status
    ]);

    doc.autoTable({
      startY: 34,
      head: [['Caravana', 'Nombre del Animal', 'Raza', 'Categoría', 'Peso', 'Precio Subasta', 'Plan Cuotas', 'Últ. Insem.', 'Estado']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [170, 130, 10], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 7.5 }
    });

    doc.save(`Reporte_Ganaderia_Bovina_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="cattle-container">
      {/* Header with KPI cards */}
      <div className="cattle-header glass-panel-gold">
        <div className="cattle-header-main">
          <div>
            <span className="cattle-badge">Módulo Especializado Agropecuario</span>
            <h1 className="cattle-title">Gestión Ganadera, Pedigrí & Control de Subastas</h1>
            <p className="cattle-sub">
              Control integral de hatos de alta genética (Nelore, Brahman, Girolando), seguimiento de compras en subasta por cuota, fechas de inseminación/IATF, stock de pajuelas y sanidad oficial SENASAG.
            </p>
          </div>

          <div className="cattle-export-actions">
            <button className="btn-export-excel" onClick={handleExportCattleExcel}>
              <FileSpreadsheet size={16} /> Excel Ganadero
            </button>
            <button className="btn-export-pdf" onClick={handleExportCattlePDF}>
              <FileDown size={16} /> Ficha Hato PDF
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrap gold">
            <Activity size={24} />
          </div>
          <div>
            <span className="kpi-label">Hato Total Registrado</span>
            <h2 className="kpi-value">{totalAnimals} <small>cabezas</small></h2>
            <span className="kpi-footnote">{totalBulls} Machos • {totalCows} Hembras</span>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrap green">
            <Heart size={24} />
          </div>
          <div>
            <span className="kpi-label">Hembras Preñadas / IATF</span>
            <h2 className="kpi-value">{pregnantCount} <small>vientres</small></h2>
            <span className="kpi-footnote">Gestaciones confirmadas ecografía</span>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrap blue">
            <Layers size={24} />
          </div>
          <div>
            <span className="kpi-label">Stock de Pajuelas (Semen)</span>
            <h2 className="kpi-value">{totalStrawsStock} <small>dosis</small></h2>
            <span className="kpi-footnote">En termo criogénico de nitrógeno</span>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrap red">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="kpi-label">Valor en Subastas (FOB)</span>
            <h2 className="kpi-value">${totalPortfolioValueUsd.toLocaleString()} <small>USD</small></h2>
            <span className="kpi-footnote">Equiv: Bs. {(totalPortfolioValueUsd * 6.96).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="cattle-tabs">
        <button 
          className={`cattle-tab-btn ${activeSubTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('list')}
        >
          <Layers size={17} /> Inventario Hato ({cattleList.length})
        </button>
        <button 
          className={`cattle-tab-btn ${activeSubTab === 'detail' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('detail')}
        >
          <GitBranch size={17} /> Árbol Genealógico & Ficha
        </button>
        <button 
          className={`cattle-tab-btn ${activeSubTab === 'auctions' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('auctions')}
        >
          <CreditCard size={17} /> Subastas & Plan de Cuotas
        </button>
        <button 
          className={`cattle-tab-btn ${activeSubTab === 'vaccines' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('vaccines')}
        >
          <Syringe size={17} /> Calendario Sanitario & Vacunas
        </button>
        <button 
          className={`cattle-tab-btn ${activeSubTab === 'new-animal' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('new-animal')}
        >
          <PlusCircle size={17} /> Registrar Nuevo Animal
        </button>
      </div>

      {/* SUB-TAB 1: LIST VIEW */}
      {activeSubTab === 'list' && (
        <div className="tab-pane glass-panel">
          <div className="pane-header-row">
            <div className="search-box-sm">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Buscar por arete, nombre, HBP o raza..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-pills-row">
              <select value={filterBreed} onChange={(e) => setFilterBreed(e.target.value)} className="select-pill">
                <option value="Todos">Todas las Razas</option>
                <option value="Nelore">Nelore</option>
                <option value="Brahman">Brahman</option>
                <option value="Girolando">Girolando</option>
              </select>

              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="select-pill">
                <option value="Todos">Todas las Categorías</option>
                <option value="Toro">Toros</option>
                <option value="Vaca">Vacas / Donadoras</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Arete / Foto</th>
                  <th>Nombre & HBP</th>
                  <th>Raza & Sexo</th>
                  <th>Peso (Kg)</th>
                  <th>Inseminación / Reproducción</th>
                  <th>Subasta / Cuotas</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredCattle.map(animal => (
                  <tr key={animal.id} className={selectedAnimal?.id === animal.id ? 'row-selected' : ''}>
                    <td>
                      <div className="table-item-cell">
                        <img src={animal.image} alt={animal.name} className="cattle-thumb" />
                        <span className="code-pill">{animal.earringNumber}</span>
                      </div>
                    </td>
                    <td>
                      <strong>{animal.name}</strong>
                      <div className="sub-text">HBP: {animal.hbp}</div>
                    </td>
                    <td>
                      <div>{animal.breed}</div>
                      <span className={`gender-chip ${animal.gender === 'Macho' ? 'gender-male' : 'gender-female'}`}>
                        {animal.gender === 'Macho' ? '♂ Macho' : '♀ Hembra'} • {animal.category}
                      </span>
                    </td>
                    <td>
                      <strong>{animal.weightKg} kg</strong>
                      <div className="sub-text">{animal.location}</div>
                    </td>
                    <td>
                      <div>{animal.reproduction?.method}</div>
                      <div className="gold-text">Última: {animal.reproduction?.lastInseminationDate || 'N/A'}</div>
                      {animal.reproduction?.strawsInStock > 0 && (
                        <span className="straws-pill">{animal.reproduction.strawsInStock} pajuelas en stock</span>
                      )}
                    </td>
                    <td>
                      <strong>${animal.auctionData?.totalPriceUsd?.toLocaleString()} USD</strong>
                      <div className="sub-text">
                        Cuota {animal.auctionData?.installmentsPaid} de {animal.auctionData?.installmentsCount} (${animal.auctionData?.installmentValueUsd} c/u)
                      </div>
                    </td>
                    <td>
                      <span className="status-pill status-done">{animal.status}</span>
                    </td>
                    <td>
                      <button 
                        className="btn-counter-add"
                        onClick={() => {
                          setSelectedAnimal(animal);
                          setActiveSubTab('detail');
                        }}
                      >
                        Ver Pedigrí →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PEDIGREE TREE & DETAIL */}
      {activeSubTab === 'detail' && selectedAnimal && (
        <div className="tab-pane glass-panel">
          <div className="animal-summary-banner glass-panel-gold">
            <div className="summary-left">
              <img src={selectedAnimal.image} alt={selectedAnimal.name} className="animal-detail-img" />
              <div>
                <span className="code-pill">Caravana: {selectedAnimal.earringNumber} | HBP: {selectedAnimal.hbp}</span>
                <h2>{selectedAnimal.name}</h2>
                <p>{selectedAnimal.breed} • {selectedAnimal.category} • Peso: {selectedAnimal.weightKg} kg</p>
                <p className="location-text">📍 {selectedAnimal.location}</p>
              </div>
            </div>
            <div className="summary-right">
              <div className="price-tag-box">
                <span className="label">Valor Adquisición en Subasta:</span>
                <span className="value">${selectedAnimal.auctionData?.totalPriceUsd?.toLocaleString()} USD</span>
                <span className="sub">(Bs. {selectedAnimal.auctionData?.totalPriceBs?.toLocaleString()})</span>
              </div>
              <div className="installments-box">
                <span>Plan: {selectedAnimal.auctionData?.installmentsCount} cuotas de ${selectedAnimal.auctionData?.installmentValueUsd} USD</span>
                <span className="paid-status">Pagadas: {selectedAnimal.auctionData?.installmentsPaid} / {selectedAnimal.auctionData?.installmentsCount}</span>
              </div>
            </div>
          </div>

          {/* FAMILY TREE PEDIGREE VIEW */}
          <div className="pedigree-section">
            <div className="pedigree-title-row">
              <GitBranch size={20} className="gold-text" />
              <h3>Árbol Genealógico Oficial (3 Generaciones de Sangre)</h3>
            </div>

            <div className="pedigree-tree-wrapper">
              {/* Target Animal */}
              <div className="pedigree-col center-animal">
                <div className="pedigree-card focal-card">
                  <span className="pedigree-role">EJEMPLAR</span>
                  <strong>{selectedAnimal.name}</strong>
                  <span className="ped-reg">{selectedAnimal.hbp}</span>
                  <span className="ped-origin">{selectedAnimal.breed}</span>
                </div>
              </div>

              {/* Parents (Padres) */}
              <div className="pedigree-col parents-col">
                <div className="pedigree-card father-card">
                  <span className="pedigree-role">PADRE (SIRE)</span>
                  <strong>{selectedAnimal.pedigree?.father?.name || 'Padre No Registrado'}</strong>
                  <span className="ped-reg">Reg: {selectedAnimal.pedigree?.father?.reg}</span>
                  <span className="ped-origin">{selectedAnimal.pedigree?.father?.origin}</span>
                  <p className="ped-note">{selectedAnimal.pedigree?.father?.notes}</p>
                </div>

                <div className="pedigree-card mother-card">
                  <span className="pedigree-role">MADRE (DAM)</span>
                  <strong>{selectedAnimal.pedigree?.mother?.name || 'Madre No Registrada'}</strong>
                  <span className="ped-reg">Reg: {selectedAnimal.pedigree?.mother?.reg}</span>
                  <span className="ped-origin">{selectedAnimal.pedigree?.mother?.origin}</span>
                  <p className="ped-note">{selectedAnimal.pedigree?.mother?.notes}</p>
                </div>
              </div>

              {/* Grandparents (Abuelos) */}
              <div className="pedigree-col grandparents-col">
                <div className="pedigree-card grand-card">
                  <span className="pedigree-role">ABUELO PATERNO</span>
                  <strong>{selectedAnimal.pedigree?.paternalGrandfather?.name || 'Basco da SM'}</strong>
                  <span className="ped-reg">{selectedAnimal.pedigree?.paternalGrandfather?.reg}</span>
                </div>

                <div className="pedigree-card grand-card">
                  <span className="pedigree-role">ABUELA PATERNA</span>
                  <strong>{selectedAnimal.pedigree?.paternalGrandmother?.name || 'Jalapa da Bela'}</strong>
                  <span className="ped-reg">{selectedAnimal.pedigree?.paternalGrandmother?.reg}</span>
                </div>

                <div className="pedigree-card grand-card">
                  <span className="pedigree-role">ABUELO MATERNO</span>
                  <strong>{selectedAnimal.pedigree?.maternalGrandfather?.name || 'Bitelo da SS'}</strong>
                  <span className="ped-reg">{selectedAnimal.pedigree?.maternalGrandfather?.reg}</span>
                </div>

                <div className="pedigree-card grand-card">
                  <span className="pedigree-role">ABUELA MATERNA</span>
                  <strong>{selectedAnimal.pedigree?.maternalGrandmother?.name || 'Rancharia da Carpa'}</strong>
                  <span className="ped-reg">{selectedAnimal.pedigree?.maternalGrandmother?.reg}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reproductive & Veterinary Details */}
          <div className="details-two-columns">
            <div className="detail-box glass-panel">
              <div className="box-header">
                <Calendar size={18} className="gold-text" />
                <h4>Registro Reproductivo & Inseminación</h4>
              </div>
              <ul className="info-list">
                <li><strong>Método:</strong> {selectedAnimal.reproduction?.method}</li>
                <li><strong>Fecha Última Inseminación:</strong> {selectedAnimal.reproduction?.lastInseminationDate}</li>
                {selectedAnimal.reproduction?.bullUsed && (
                  <li><strong>Toro Donante Utilizado:</strong> {selectedAnimal.reproduction?.bullUsed}</li>
                )}
                {selectedAnimal.reproduction?.pregnancyConfirmedDate && (
                  <li><strong>Diagnóstico de Gestación:</strong> {selectedAnimal.reproduction?.pregnancyConfirmedDate}</li>
                )}
                {selectedAnimal.reproduction?.estimatedCalvingDate && (
                  <li><strong>Fecha Estimada de Parto:</strong> {selectedAnimal.reproduction?.estimatedCalvingDate}</li>
                )}
                {selectedAnimal.reproduction?.strawsInStock !== null && (
                  <li><strong>Pajuelas de Semen Congelado en Stock:</strong> {selectedAnimal.reproduction?.strawsInStock} unidades (${selectedAnimal.reproduction?.strawPriceUsd} USD/dosis)</li>
                )}
              </ul>
            </div>

            <div className="detail-box glass-panel">
              <div className="box-header">
                <Syringe size={18} className="gold-text" />
                <h4>Plan Sanitario & Vacunación Aplicada</h4>
              </div>
              <table className="mini-vaccine-table">
                <thead>
                  <tr>
                    <th>Biológico / Vacuna</th>
                    <th>Aplicada</th>
                    <th>Próximo Refuerzo</th>
                    <th>Lote</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAnimal.vaccines?.map((v, i) => (
                    <tr key={i}>
                      <td><strong>{v.name}</strong></td>
                      <td>{v.applicationDate}</td>
                      <td><span className="gold-text">{v.nextDueDate}</span></td>
                      <td><span className="code-pill">{v.lot}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: AUCTION & INSTALLMENT TRACKING */}
      {activeSubTab === 'auctions' && (
        <div className="tab-pane glass-panel">
          <div className="pane-header-row">
            <div>
              <h3>Seguimiento Financiero de Compras en Subasta (Planes de Cuotas)</h3>
              <p>Control exacto de pagos diferidos (10, 12, 24 cuotas) adquiridos en remates de élite.</p>
            </div>
          </div>

          <div className="auctions-grid">
            {cattleList.map(item => {
              const total = item.auctionData?.totalPriceUsd || 0;
              const installments = item.auctionData?.installmentsCount || 1;
              const paid = item.auctionData?.installmentsPaid || 0;
              const instVal = item.auctionData?.installmentValueUsd || 0;
              const balance = (installments - paid) * instVal;
              const percent = Math.round((paid / installments) * 100);

              return (
                <div key={item.id} className="auction-card glass-panel-gold">
                  <div className="auction-top">
                    <div>
                      <span className="code-pill">{item.earringNumber}</span>
                      <h4>{item.name}</h4>
                      <span className="sub-text">Vendedor: {item.auctionData?.sellerCabaña}</span>
                    </div>
                    <div className="auction-house-tag">
                      {item.auctionData?.auctionHouse}
                    </div>
                  </div>

                  <div className="auction-metrics-row">
                    <div>
                      <span className="lbl">Precio Total Martillo:</span>
                      <strong>${total.toLocaleString()} USD</strong>
                      <div className="sub-text">Bs. {(total * 6.96).toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="lbl">Valor por Cuota:</span>
                      <strong>${instVal.toLocaleString()} USD</strong>
                    </div>
                    <div>
                      <span className="lbl">Saldo Pendiente:</span>
                      <strong className={balance > 0 ? 'cost-tag' : 'green-text'}>
                        ${balance.toLocaleString()} USD
                      </strong>
                    </div>
                  </div>

                  <div className="installments-progress-bar">
                    <div className="progress-labels">
                      <span>Progreso: {paid} de {installments} cuotas ({percent}%)</span>
                      <span>Fecha compra: {item.auctionData?.purchaseDate}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-bar-fill" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>

                  <div className="auction-footer-actions">
                    {paid < installments ? (
                      <button 
                        className="btn-advance-status"
                        onClick={() => {
                          onUpdateAnimal(item.id, {
                            ...item,
                            auctionData: {
                              ...item.auctionData,
                              installmentsPaid: item.auctionData.installmentsPaid + 1
                            }
                          });
                          alert(`¡Pago de cuota #${paid + 1} registrado con éxito para ${item.name}!`);
                        }}
                      >
                        Registrar Pago Cuota (+1)
                      </button>
                    ) : (
                      <span className="paid-chip">✓ Adquisición 100% Cancelada</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: VACCINE CALENDAR */}
      {activeSubTab === 'vaccines' && (
        <div className="tab-pane glass-panel">
          <div className="pane-header-row">
            <div>
              <h3>Calendario Sanitario Bovino & Alertas SENASAG</h3>
              <p>Control de inmunización contra Aftosa, Brucelosis, Clostridiosis y Rabia Paresiante.</p>
            </div>
          </div>

          <div className="vaccine-grid-summary">
            {cattleList.map(c => (
              <div key={c.id} className="vaccine-animal-card glass-panel">
                <div className="card-top">
                  <strong>{c.name} ({c.earringNumber})</strong>
                  <span className="sub-text">{c.category} • {c.location}</span>
                </div>
                <div className="vaccines-badges-list">
                  {c.vaccines?.map((vac, vi) => (
                    <div key={vi} className="vac-badge-item">
                      <div className="vac-name">
                        <Syringe size={14} className="gold-text" />
                        <span>{vac.name}</span>
                      </div>
                      <div className="vac-dates">
                        <span>Aplicada: {vac.applicationDate}</span>
                        <span className="next-alert">Vence: {vac.nextDueDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: NEW ANIMAL FORM */}
      {activeSubTab === 'new-animal' && (
        <div className="tab-pane glass-panel">
          <div className="pane-header-row">
            <div>
              <h3>Registrar Nuevo Ejemplar Bovino de Alta Genética</h3>
              <p>Ingrese los datos de registro genealógico, compra en subasta y genealogía.</p>
            </div>
          </div>

          <form onSubmit={handleCreateSubmit} className="import-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Nombre del Animal *</label>
                <input 
                  type="text" 
                  value={newBov.name}
                  onChange={(e) => setNewBov({ ...newBov, name: e.target.value })}
                  placeholder="Ej: Faraón FIV Sausalito"
                  required
                />
              </div>

              <div className="form-group">
                <label>Caravana / Arete Oficial *</label>
                <input 
                  type="text" 
                  value={newBov.earringNumber}
                  onChange={(e) => setNewBov({ ...newBov, earringNumber: e.target.value })}
                  placeholder="Ej: SCZ-994"
                  required
                />
              </div>

              <div className="form-group">
                <label>HBP / Registro Genealógico (ASOCEBU)</label>
                <input 
                  type="text" 
                  value={newBov.hbp}
                  onChange={(e) => setNewBov({ ...newBov, hbp: e.target.value })}
                  placeholder="Ej: BOL-NEL-2025-4401"
                />
              </div>

              <div className="form-group">
                <label>Raza Bovina</label>
                <select value={newBov.breed} onChange={(e) => setNewBov({ ...newBov, breed: e.target.value })}>
                  <option value="Nelore Mocho PO">Nelore Mocho PO</option>
                  <option value="Nelore Padrão PO">Nelore Padrão PO</option>
                  <option value="Brahman Rojo Americano">Brahman Rojo Americano</option>
                  <option value="Brahman Blanco">Brahman Blanco</option>
                  <option value="Girolando Plus">Girolando Plus (Lechero)</option>
                  <option value="Brangus Colorado">Brangus Colorado</option>
                </select>
              </div>

              <div className="form-group">
                <label>Categoría</label>
                <select value={newBov.category} onChange={(e) => setNewBov({ ...newBov, category: e.target.value })}>
                  <option value="Toro Reproductor">Toro Reproductor</option>
                  <option value="Vaca Donadora (FIV)">Vaca Donadora (FIV)</option>
                  <option value="Vaca Lechera Alta Producción">Vaca Lechera Alta Producción</option>
                  <option value="Vaquilla Preñada">Vaquilla Preñada</option>
                  <option value="Ternero / Desmamante">Ternero / Desmamante</option>
                </select>
              </div>

              <div className="form-group">
                <label>Sexo</label>
                <select value={newBov.gender} onChange={(e) => setNewBov({ ...newBov, gender: e.target.value })}>
                  <option value="Macho">Macho</option>
                  <option value="Hembra">Hembra</option>
                </select>
              </div>

              <div className="form-group">
                <label>Peso Actual (Kg)</label>
                <input 
                  type="number" 
                  value={newBov.weightKg}
                  onChange={(e) => setNewBov({ ...newBov, weightKg: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Ubicación / Piquete</label>
                <input 
                  type="text" 
                  value={newBov.location}
                  onChange={(e) => setNewBov({ ...newBov, location: e.target.value })}
                  placeholder="Ej: Cabaña El Palmar - Piquete 2"
                />
              </div>

              <div className="form-group">
                <label>Casa de Subasta / Remate</label>
                <input 
                  type="text" 
                  value={newBov.auctionHouse}
                  onChange={(e) => setNewBov({ ...newBov, auctionHouse: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Precio Total Adquisición ($ USD)</label>
                <input 
                  type="number" 
                  value={newBov.totalPriceUsd}
                  onChange={(e) => setNewBov({ ...newBov, totalPriceUsd: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Número de Cuotas</label>
                <input 
                  type="number" 
                  value={newBov.installmentsCount}
                  onChange={(e) => setNewBov({ ...newBov, installmentsCount: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Cuotas Ya Pagadas</label>
                <input 
                  type="number" 
                  value={newBov.installmentsPaid}
                  onChange={(e) => setNewBov({ ...newBov, installmentsPaid: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Padre (Sire)</label>
                <input 
                  type="text" 
                  value={newBov.fatherName}
                  onChange={(e) => setNewBov({ ...newBov, fatherName: e.target.value })}
                  placeholder="Nombre y Registro del Padre"
                />
              </div>

              <div className="form-group">
                <label>Madre (Dam)</label>
                <input 
                  type="text" 
                  value={newBov.motherName}
                  onChange={(e) => setNewBov({ ...newBov, motherName: e.target.value })}
                  placeholder="Nombre y Registro de la Madre"
                />
              </div>

              <div className="form-group">
                <label>Fecha Última Inseminación</label>
                <input 
                  type="date" 
                  value={newBov.lastInseminationDate}
                  onChange={(e) => setNewBov({ ...newBov, lastInseminationDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Stock de Pajuelas (Semen Congelado)</label>
                <input 
                  type="number" 
                  value={newBov.strawsInStock}
                  onChange={(e) => setNewBov({ ...newBov, strawsInStock: e.target.value })}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-gold-action large">
                <PlusCircle size={18} /> Guardar Registro Bovino
              </button>
              <button type="button" className="btn-cancel" onClick={() => setActiveSubTab('list')}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
