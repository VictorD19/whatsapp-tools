export const instagramSections = [
  { id: 'conversas', label: 'Conversas', preview: false },
  { id: 'automacoes', label: 'Automações', preview: true },
  { id: 'assistente', label: 'Assistente IA', preview: true },
  { id: 'menus', label: 'Menus do Direct', preview: true },
  { id: 'conexao', label: 'Conexão', preview: false },
  { id: 'resultados', label: 'Resultados', preview: true },
  { id: 'simulador', label: 'Laboratório de testes', preview: true },
] as const
export type InstagramSection = typeof instagramSections[number]['id']
export type InstagramPreviewSection = 'automacoes' | 'assistente' | 'menus' | 'resultados' | 'simulador'
export const isInstagramSection = (value: unknown): value is InstagramSection =>
  typeof value === 'string' && instagramSections.some(section => section.id === value)
