const API_URL = import.meta.env.VITE_API_BASE_URL || '/api/funcionarios';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path = '', options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (response.status === 204) return null;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(body?.mensagem || 'Não foi possível concluir a operação.', response.status);
  }

  return body;
}

export const funcionariosApi = {
  list: () => request(),
  findById: (id) => request(`/${id}`),
  create: (funcionario) => request('', { method: 'POST', body: JSON.stringify(funcionario) }),
  replace: (id, funcionario) => request(`/${id}`, { method: 'PUT', body: JSON.stringify(funcionario) }),
  patch: (id, fields) => request(`/${id}`, { method: 'PATCH', body: JSON.stringify(fields) }),
  remove: (id) => request(`/${id}`, { method: 'DELETE' }),
};
