import sys
import getopt
import random


def main(argv):
  try:
    o, _ = getopt.getopt(argv, "hn:", ["help", "number"])
  except getopt.GetoptError:
    print("not an option")
    sys.exit(2)
  for f, a in o:
    if f in ("-h", "--help"):
      print("""
Usage:
-n | --number\t\tSpecify number of distributions to return (e.g. 2x the number of packets)
""")
      sys.exit()
    elif f in ("-n", "--number"):
      samples = int(a)
    else:
      sys.exit()

  allTemplates = open("templates.txt", "r")
  randomTemplates = reservoirSample(allTemplates, samples)
  randomTemplatesFile = open("random_templates.txt", "w")
  print(*randomTemplates, sep="\n", file=randomTemplatesFile)


def reservoirSample(file, k):
  sample = []
  with file as f:
    for n, line in enumerate(f):
      if n < k:
        sample.append(line.rstrip())
      else:
        r = random.randint(0, n)
        if r < k:
          sample[r] = line.rstrip()
  return sample


if __name__ == "__main__":
  main(sys.argv[1:])
