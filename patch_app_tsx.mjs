import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const healthState = `
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [apiHealth, setApiHealth] = useState<'checking' | 'ready' | 'error'>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setApiHealth('ready');
        } else {
          setApiHealth('error');
        }
      })
      .catch(() => {
        setApiHealth('error');
      });
  }, []);
`;
code = code.replace(
  "const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);",
  healthState.trim()
);

const analyzeCheck = `
  const handleStartAnalysis = async () => {
    if (apiHealth === 'error') {
      setErrorMessage({ message: '智能分析服务未正常启动，请刷新页面后重试。', retryable: false });
      return;
    }
`;
code = code.replace(
  "const handleStartAnalysis = async () => {",
  analyzeCheck.trim()
);

// We should also replace the parsing error in phase 4 to be more clear, just in case
// And remove internal Zod fields from error messages

fs.writeFileSync('src/App.tsx', code);
