export function kMeansCluster(colors, numClusters, maxIterations = 100) {
  const numColors = colors.length / 4;

  // Initialize clusters randomly
  const clusters = new Float32Array(numClusters * 4);
  for (let i = 0; i < numClusters; i++) {
    const randomIndex = Math.floor(Math.random() * numColors) * 4;
    clusters.set(colors.subarray(randomIndex, randomIndex + 4), i * 4);
  }

  const assignments = new Uint32Array(numColors);
  const clusterSums = new Float32Array(numClusters * 4);
  const clusterCounts = new Uint32Array(numClusters);

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Reset sums and counts
    clusterSums.fill(0);
    clusterCounts.fill(0);

    // Assign colors to nearest cluster
    for (let i = 0; i < numColors; i++) {
      let minDistance = Infinity;
      let nearestCluster = 0;

      for (let j = 0; j < numClusters; j++) {
        const distance = colorDistance(colors, i * 4, clusters, j * 4);
        if (distance < minDistance) {
          minDistance = distance;
          nearestCluster = j;
        }
      }

      assignments[i] = nearestCluster;
      clusterCounts[nearestCluster]++;
      for (let k = 0; k < 4; k++) {
        clusterSums[nearestCluster * 4 + k] += colors[i * 4 + k];
      }
    }

    // Update cluster centers
    let changed = false;
    for (let i = 0; i < numClusters; i++) {
      if (clusterCounts[i] > 0) {
        for (let k = 0; k < 4; k++) {
          const newValue = clusterSums[i * 4 + k] / clusterCounts[i];
          if (newValue !== clusters[i * 4 + k]) {
            clusters[i * 4 + k] = newValue;
            changed = true;
          }
        }
      }
    }

    // If clusters didn't change, we've converged
    if (!changed) break;
  }

  return { clusters, assignments };
}

export function colorDistance(colors1, offset1, colors2, offset2) {
  let sum = 0;
  for (let i = 0; i < 3; i++) {
    // Only use RGB, ignore alpha
    const diff = colors1[offset1 + i] - colors2[offset2 + i];
    sum += diff * diff;
  }
  return sum; // No need for sqrt as we're just comparing
}
