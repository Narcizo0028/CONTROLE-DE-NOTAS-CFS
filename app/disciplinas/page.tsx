'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import DataTable from '@/components/DataTable';
import type { Disciplina } from '@/lib/types';

export default function DisciplinasPage() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);

  useEffect(() => {
    fetch('/api/disciplinas').then((r) => r.json()).then(setDisciplinas);
  }, []);

  const tipoLabel = (d: Disciplina) => {
    if (d.tipo_avaliacao === 'APTO_INAPTO') return 'APTO / INAPTO';
    if (d.qtd_trabalhos === 2) return 'Trabalho 1 + Trabalho 2 + AVF';
    if (d.possui_avc) return 'Trabalho + AVC + AVF';
    return 'Trabalho + AVF';
  };

  const camposResumo = (d: Disciplina) => {
    if (d.tipo_avaliacao === 'APTO_INAPTO') return '—';
    const parts: string[] = [];
    if (d.qtd_trabalhos === 2) {
      parts.push(`T1(${d.max_trabalho_1})`, `T2(${d.max_trabalho_2})`);
    } else if (d.max_trabalho) {
      parts.push(`T(${d.max_trabalho})`);
    }
    if (d.possui_avc) parts.push(`AVC(${d.max_avc})`);
    if (d.possui_avf) parts.push(`AVF(${d.max_avf})`);
    return parts.join(' + ');
  };

  return (
    <AppLayout title="Disciplinas — CFS 2026">
      <div className="space-y-4">
        <div className="card bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>30 disciplinas oficiais</strong> cadastradas automaticamente na inicialização do sistema.
            As regras de avaliação são parametrizadas por disciplina — alterações nos atributos refletem no lançamento de notas.
          </p>
        </div>

        <DataTable
          data={disciplinas}
          searchKeys={['nome', 'tipo_avaliacao']}
          pageSize={15}
          columns={[
            { key: 'ordem', label: '#' },
            { key: 'nome', label: 'Disciplina' },
            { key: 'carga_horaria', label: 'CH', render: (d) => `${d.carga_horaria}h` },
            { key: 'tipo_avaliacao', label: 'Tipo', render: (d) => tipoLabel(d) },
            { key: 'campos', label: 'Campos / Máximos', render: (d) => camposResumo(d) },
            { key: 'pontos_distribuidos', label: 'Total Pts' },
            {
              key: 'ranking', label: 'Ranking', sortable: false,
              render: (d) => d.participa_ranking ? <span className="badge-green">Sim</span> : <span className="badge-red">Não</span>,
            },
          ]}
        />
      </div>
    </AppLayout>
  );
}
