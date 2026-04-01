import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for running Monte Carlo simulation with Web Worker
 */
export function useSimulation() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const workerRef = useRef(null);

  const runSimulation = useCallback(async ({
    portfolio,
    phases,
    inflationRate,
    iterations,
    historicalReturns
  }) => {
    // Reset state
    setIsRunning(true);
    setProgress(0);
    setResults(null);
    setError(null);

    try {
      // Create Web Worker
      const worker = new Worker(
        new URL('../workers/simulation-worker.js', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      // Set up promise to wait for results
      const simulationPromise = new Promise((resolve, reject) => {
        worker.onmessage = (e) => {
          const { type, payload } = e.data;

          if (type === 'PROGRESS') {
            setProgress(payload.percent);
          } else if (type === 'COMPLETE') {
            resolve(payload.results);
          } else if (type === 'ERROR') {
            reject(new Error(payload.error));
          }
        };

        worker.onerror = (e) => {
          reject(new Error(`Worker error: ${e.message}`));
        };
      });

      // Send simulation request to worker
      worker.postMessage({
        type: 'RUN_SIMULATION',
        payload: {
          portfolio,
          phases,
          inflationRate,
          iterations,
          historicalReturns
        }
      });

      // Wait for results
      const simulationResults = await simulationPromise;

      // Clean up worker
      worker.terminate();
      workerRef.current = null;

      // Set results
      setResults(simulationResults);
      setIsRunning(false);
      setProgress(100);

      return simulationResults;

    } catch (err) {
      setError(err.message);
      setIsRunning(false);

      // Clean up worker on error
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }

      throw err;
    }
  }, []);

  const cancelSimulation = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsRunning(false);
    setProgress(0);
  }, []);

  return {
    isRunning,
    progress,
    results,
    error,
    runSimulation,
    cancelSimulation
  };
}
