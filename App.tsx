
import React, { useState } from 'react';
import JSZip from 'jszip';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { parseLogFile } from './services/logParser';
import { ParsedData, LogFileContext } from './types';

function App() {
  const [data, setData] = useState<ParsedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('로그 분석 중...');
  
  // Store all extracted logs to allow switching without re-reading zip
  const [cachedMainLogs, setCachedMainLogs] = useState<LogFileContext[]>([]);
  const [cachedBillingContent, setCachedBillingContent] = useState<string>('');

  const processContent = (mainContent: string, fileName: string, billingContent: string, availableFiles: LogFileContext[]) => {
    try {
      const parsed = parseLogFile(mainContent, fileName, billingContent);
      // Attach the list of available files to the parsed data so the Dashboard can show the selector
      parsed.fileList = availableFiles;
      setData(parsed);
    } catch (error) {
      console.error("Failed to parse log file", error);
      alert("로그 파일을 분석하는 데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (fileName: string) => {
    const selectedFile = cachedMainLogs.find(f => f.fileName === fileName);
    if (selectedFile) {
      setIsLoading(true);
      setLoadingMessage(`${fileName} 분석 중...`);
      // Use setTimeout to allow UI to update
      setTimeout(() => {
        processContent(selectedFile.content, selectedFile.fileName, cachedBillingContent, cachedMainLogs);
      }, 50);
    }
  };

  const handleFile = async (file: File) => {
    setIsLoading(true);
    setLoadingMessage('파일 읽는 중...');

    // Small delay to render loading state
    await new Promise(resolve => setTimeout(resolve, 100));

    if (file.name.endsWith('.zip')) {
      setLoadingMessage('ZIP 압축 해제 및 파일 검색 중...');
      try {
        const zip = await JSZip.loadAsync(file);
        
        const mainLogs: LogFileContext[] = [];
        let billingContents: string[] = [];

        // Traverse ZIP
        const promises: Promise<void>[] = [];
        
        zip.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return;
            const name = relativePath; // Keep full path to distinguish logic
            const lowerName = name.toLowerCase();
            
            // 1. Billing Logs (Aggregate all)
            // iOS: purchase_log_*.txt
            // Android: billing_*.txt
            if (lowerName.includes('purchase_log_') || lowerName.includes('billing_')) {
                promises.push(
                    zipEntry.async('string').then(content => {
                        billingContents.push(content);
                    })
                );
                return;
            }

            // 2. Main Logs
            // iOS: inside logFiles/ folder and starts with log_
            // Android: root level (usually) or just .txt excluding billing
            const isIosLog = lowerName.includes('logfiles/') && lowerName.includes('log_');
            const isAndroidLog = !lowerName.includes('/') && (lowerName.endsWith('.txt') || lowerName.endsWith('.log')) && !lowerName.startsWith('billing');

            if (isIosLog || isAndroidLog) {
                promises.push(
                    zipEntry.async('string').then(content => {
                        // Extract date from filename for sorting if possible
                        // e.g., log_20231205.txt
                        // Simple heuristic: latest file usually has larger number/date string
                        mainLogs.push({
                            fileName: name.split('/').pop() || name, // Show only filename
                            content: content,
                            // Store original name for sorting heuristic
                        });
                    })
                );
            }
        });

        await Promise.all(promises);

        if (mainLogs.length > 0) {
            // Sort logs by name descending (assuming date is in filename: log_2025... > log_2024...)
            mainLogs.sort((a, b) => b.fileName.localeCompare(a.fileName));
            
            setCachedMainLogs(mainLogs);
            setCachedBillingContent(billingContents.join('\n'));

            // Parse the latest log (index 0)
            const latestLog = mainLogs[0];
            setLoadingMessage(`${latestLog.fileName} (최신) 분석 중...`);
            
            processContent(latestLog.content, latestLog.fileName, billingContents.join('\n'), mainLogs);
        } else {
            alert("ZIP 파일 내에서 분석 가능한 로그 파일(iOS: logFiles/log_*, Android: *.txt)을 찾을 수 없습니다.");
            setIsLoading(false);
        }

      } catch (e) {
        console.error(e);
        alert("ZIP 파일 압축 해제 실패. 올바른 파일인지 확인해주세요.");
        setIsLoading(false);
      }
    } else {
      // Normal text file
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          // Single file mode
          const singleFileCtx = [{ fileName: file.name, content: text }];
          setCachedMainLogs(singleFileCtx);
          setCachedBillingContent('');
          processContent(text, file.name, '', singleFileCtx);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleReset = () => {
    setData(null);
    setCachedMainLogs([]);
    setCachedBillingContent('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (data) {
    return <Dashboard data={data} onReset={handleReset} onFileSelect={handleFileSelect} />;
  }

  return <FileUpload onFileLoaded={handleFile} />;
}

export default App;
