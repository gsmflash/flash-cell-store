function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Flash Cell Store</h1>
        <p className="text-muted-foreground text-lg">
          Estrutura base configurada com sucesso 🚀
        </p>
        <p className="text-sm text-muted-foreground">
          Ambiente: {import.meta.env.MODE}
        </p>
      </div>
    </div>
  );
}

export default App;
