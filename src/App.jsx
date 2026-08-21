import React, { useEffect, useMemo, useState } from 'react';
import { funcionariosApi } from './api.js';

const statuses = ['EM_ANALISE', 'APROVADO', 'REPROVADO', 'CONTRATADO'];
const emptyForm = {
  nome: '', email: '', telefone: '', cargo: '', departamento: '', salario: '', cidade: '', status: 'EM_ANALISE',
};

const labels = {
  EM_ANALISE: 'Em análise', APROVADO: 'Aprovado', REPROVADO: 'Reprovado', CONTRATADO: 'Contratado',
};

function normalize(form) {
  return {
    ...form,
    nome: form.nome.trim(),
    email: form.email.trim(),
    telefone: form.telefone.replace(/\D/g, ''),
    cargo: form.cargo.trim(),
    departamento: form.departamento.trim(),
    cidade: form.cidade.trim(),
    salario: Number(form.salario),
  };
}

function App() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [partial, setPartial] = useState({ id: '', cargo: '', salario: '', status: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setFuncionarios(await funcionariosApi.list());
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => funcionarios.filter((funcionario) => {
    const searchable = `${funcionario.nome} ${funcionario.cargo} ${funcionario.departamento} ${funcionario.status}`.toLowerCase();
    return searchable.includes(query.toLowerCase()) && (statusFilter === 'TODOS' || funcionario.status === statusFilter);
  }), [funcionarios, query, statusFilter]);

  const metrics = useMemo(() => statuses.reduce((result, status) => ({
    ...result,
    [status]: funcionarios.filter((funcionario) => funcionario.status === status).length,
  }), { total: funcionarios.length }), [funcionarios]);

  const updateForm = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const updatePartial = (event) => setPartial({ ...partial, [event.target.name]: event.target.value });

  const clearFeedback = () => { setError(''); setMessage(''); };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearFeedback();
    try {
      const payload = normalize(form);
      if (editingId) {
        await funcionariosApi.replace(editingId, payload);
        setMessage('Funcionário atualizado completamente com PUT.');
      } else {
        await funcionariosApi.create(payload);
        setMessage('Funcionário cadastrado com POST.');
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const startEdit = (funcionario) => {
    setEditingId(funcionario.id);
    setForm({ ...funcionario, salario: String(funcionario.salario) });
    clearFeedback();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (funcionario) => {
    if (!window.confirm(`Excluir ${funcionario.nome}? Esta ação não pode ser desfeita.`)) return;
    clearFeedback();
    try {
      await funcionariosApi.remove(funcionario.id);
      setMessage('Funcionário excluído com DELETE.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleLookup = async (event) => {
    event.preventDefault();
    clearFeedback();
    setLookupResult(null);
    try {
      setLookupResult(await funcionariosApi.findById(lookupId));
      setMessage('Consulta individual realizada com GET.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handlePartial = async (event) => {
    event.preventDefault();
    clearFeedback();
    const changes = {};
    if (partial.cargo.trim()) changes.cargo = partial.cargo.trim();
    if (partial.salario !== '') changes.salario = Number(partial.salario);
    if (partial.status) changes.status = partial.status;
    if (!Object.keys(changes).length) {
      setError('Informe pelo menos um campo para atualização parcial.');
      return;
    }
    try {
      await funcionariosApi.patch(partial.id, changes);
      setMessage('Atualização parcial concluída com PATCH.');
      setPartial({ id: '', cargo: '', salario: '', status: '' });
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">P</span>
          <div><strong>PicPay</strong><span>Recrutamento</span></div>
        </div>
        <button className="secondary-button" type="button" onClick={load}>Atualizar dados</button>
      </header>

      <section className="page-heading">
        <div>
          <p className="eyebrow">RECRUTAMENTO</p>
          <h1>Acompanhe quem está no processo.</h1>
          <p>Organize as pessoas candidatas, avance etapas e mantenha as informações do time em um só lugar.</p>
        </div>
      </section>

      <section className="metrics" aria-label="Indicadores de candidatos">
        <Metric label="Total" value={metrics.total} tone="neutral" />
        {statuses.map((status) => <Metric key={status} label={labels[status]} value={metrics[status]} tone={status} />)}
      </section>

      {(message || error) && <p className={`feedback ${error ? 'feedback-error' : 'feedback-success'}`} role="status">{error || message}</p>}

      <section className="workspace">
        <article className="panel form-panel">
          <div className="panel-heading">
            <div><p className="method">{editingId ? 'EDIÇÃO EM ANDAMENTO' : 'NOVO CADASTRO'}</p><h2>{editingId ? 'Atualizar pessoa candidata' : 'Adicionar pessoa candidata'}</h2></div>
            {editingId && <button type="button" className="text-button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancelar edição</button>}
          </div>
          <form onSubmit={handleSubmit} className="employee-form">
            <Field label="Nome" name="nome" value={form.nome} onChange={updateForm} required />
            <Field label="E-mail" name="email" type="email" value={form.email} onChange={updateForm} required />
            <Field label="Telefone" name="telefone" inputMode="numeric" placeholder="11999999999" value={form.telefone} onChange={updateForm} required />
            <Field label="Cargo" name="cargo" value={form.cargo} onChange={updateForm} required />
            <Field label="Departamento" name="departamento" value={form.departamento} onChange={updateForm} required />
            <Field label="Salário" name="salario" type="number" min="0" step="0.01" value={form.salario} onChange={updateForm} required />
            <Field label="Cidade" name="cidade" value={form.cidade} onChange={updateForm} required />
            <label>Status<select name="status" value={form.status} onChange={updateForm}>{statuses.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></label>
            <button className="primary-button" type="submit">{editingId ? 'Salvar alterações' : 'Adicionar à seleção'}</button>
          </form>
        </article>

        <aside className="side-panels">
          <article className="panel compact-panel">
            <p className="method">CONSULTA RÁPIDA</p><h2>Localizar cadastro</h2>
            <form className="inline-form" onSubmit={handleLookup}><input type="number" min="1" value={lookupId} onChange={(event) => setLookupId(event.target.value)} placeholder="ID" required /><button className="secondary-button">Buscar</button></form>
            {lookupResult && <EmployeeSummary funcionario={lookupResult} />}
          </article>
          <article className="panel compact-panel">
            <p className="method">ATUALIZAÇÃO RÁPIDA</p><h2>Avançar uma etapa</h2>
            <form className="partial-form" onSubmit={handlePartial}>
              <input type="number" name="id" min="1" value={partial.id} onChange={updatePartial} placeholder="ID do funcionário" required />
              <input name="cargo" value={partial.cargo} onChange={updatePartial} placeholder="Novo cargo (opcional)" />
              <input type="number" name="salario" min="0" step="0.01" value={partial.salario} onChange={updatePartial} placeholder="Novo salário (opcional)" />
              <select name="status" value={partial.status} onChange={updatePartial}><option value="">Novo status (opcional)</option>{statuses.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select>
              <button className="secondary-button" type="submit">Aplicar PATCH</button>
            </form>
          </article>
        </aside>
      </section>

      <section className="panel list-panel">
        <div className="panel-heading"><div><p className="method">BASE DE CANDIDATOS</p><h2>Pessoas cadastradas</h2></div><span>{filtered.length} resultado(s)</span></div>
        <div className="filters"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, cargo, departamento ou status" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="TODOS">Todos os status</option>{statuses.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></div>
        {loading ? <p className="empty-state">Carregando funcionários…</p> : filtered.length === 0 ? <p className="empty-state">Nenhum funcionário encontrado.</p> : <div className="table-wrap"><table><thead><tr><th>Nome</th><th>Cargo</th><th>Departamento</th><th>Cidade</th><th>Salário</th><th>Status</th><th>Ações</th></tr></thead><tbody>{filtered.map((funcionario) => <tr key={funcionario.id}><td><strong>{funcionario.nome}</strong><small>{funcionario.email}</small></td><td>{funcionario.cargo}</td><td>{funcionario.departamento}</td><td>{funcionario.cidade}</td><td>{Number(funcionario.salario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td><span className={`status status-${funcionario.status}`}>{labels[funcionario.status]}</span></td><td className="actions"><button className="text-button" onClick={() => startEdit(funcionario)}>Editar</button><button className="danger-button" onClick={() => handleDelete(funcionario)}>Excluir</button></td></tr>)}</tbody></table></div>}
      </section>
    </main>
  );
}

function Field({ label, name, type = 'text', ...props }) { return <label>{label}<input type={type} name={name} {...props} /></label>; }
function Metric({ label, value, tone }) { return <article className={`metric metric-${tone}`}><span>{label}</span><strong>{value}</strong></article>; }
function EmployeeSummary({ funcionario }) { return <div className="employee-summary"><strong>{funcionario.nome}</strong><span>{funcionario.cargo} · {funcionario.departamento}</span><span className={`status status-${funcionario.status}`}>{labels[funcionario.status]}</span></div>; }

export default App;
