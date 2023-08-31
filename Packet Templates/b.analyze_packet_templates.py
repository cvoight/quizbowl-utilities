from collections import defaultdict

analysis = defaultdict(lambda: defaultdict(int))

with open("templates.txt", "r") as f:
  for count, line in enumerate(f):
    for i, e in enumerate(line):
      analysis[i][e] += 1

analysisFile = open("templates_analysis.csv", "w")
for n in analysis:
  for c in analysis[n]:
    print(n, c, analysis[n][c]/(count+1), sep=",", file=analysisFile)
