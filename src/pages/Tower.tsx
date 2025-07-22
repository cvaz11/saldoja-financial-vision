export default function Tower() {
  return (
    <div className="p-8 bg-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6">🏗️ Tower - Admin</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-semibold">Total Usuários</h3>
          <p className="text-2xl">Carregando...</p>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-semibold">MRR</h3>
          <p className="text-2xl">Carregando...</p>
        </div>
      </div>
      
      <nav className="space-x-4">
        <a href="/tower/users" className="text-blue-600">Usuários</a>
        <a href="/tower/billing" className="text-blue-600">Faturamento</a>
      </nav>
    </div>
  );
}