import sys
import getopt
from itertools import compress, filterfalse, permutations, product, tee
from textwrap import wrap
from time import time
from collections import Counter, deque
from functools import reduce


def main(argv):
  try:
    o, _ = getopt.getopt(argv, "hb:", ["help", "balanced"])
  except getopt.GetoptError:
    print("not an option")
    sys.exit(2)
  for f, a in o:
    if f in ("-h", "--help"):
      print("""
Usage:
-b | --balanced\t\tSpecify fractional packet template to generate ('half' or 'quarter')
\t\t\tDefault category mix is LLHHSSEEEE for half & LHSEE for quarter.
""")
      sys.exit()
    elif f in ("-b", "--balanced"):
      if str(a) == "half":
        fraction = 2
        categories = "LLHHSSEEEE"
      elif str(a) == "quarter":
        fraction = 4
        categories = "EESHL"
      else:
        print(fraction)
        sys.exit()

  start = time()

  fractionalTemplates = generateFractionalTemplates(categories, fraction)
  combineFractionalTemplates(fractionalTemplates, fraction)

  end = time()
  print(end - start)
  sys.exit()


def generateFractionalTemplates(categories, fraction):
  fractionalTemplates = list(map("".join, permutations(categories)))
  fractionalTemplates = removeDuplicates(fractionalTemplates)
  fractionalTemplates = removeRuns(fractionalTemplates, fraction)
  return fractionalTemplates


def removeDuplicates(templates, key=None):
  seen = set()
  seen_add = seen.add
  if key is None:
    for element in filterfalse(seen.__contains__, templates):
      seen_add(element)
      yield element
  else:
    for element in templates:
      k = key(element)
      if k not in seen:
        seen_add(k)
        yield element


def removeRuns(templates, fraction):
  if fraction == 4:
    return templates
  else:
    return list(filterfalse(lambda x: "LL" in x or "HH" in x or "SS" in x, templates))


def hsqbPrint(templates):
  formattedText = wrap("   ".join(templates), width=80)
  print(*formattedText, sep="\n")
  return


def combineFractionalTemplates(templates, fraction):
  combinedTemplates = product(templates, repeat=fraction)
  combinedTemplates = repeatCheck(combinedTemplates, fraction)
  templates = deque()
  for t in combinedTemplates:
    templates.append(reduce(lambda x, y: x + y, t))

  finalTemplates = deque()
  conjoin = [(5, 6), (10, 11), (15, 16)]
  while True:
    examiner = ""
    try:
      examiner = templates.pop()
      for m, n in conjoin:
        if examiner[m] == examiner[n] == 'L':
          continue
        if examiner[m] == examiner[n] == 'H':
          continue
        if examiner[m] == examiner[n] == 'S':
          continue
      if (not "E" in examiner[7:10]) or (not "E" in examiner[10:13]):
        continue
      finalTemplates.append(examiner)
    except IndexError:
      break
  print(len(finalTemplates))
  templatesFile = open("templates.txt", "w")
  print(*finalTemplates, sep="\n", file=templatesFile)


def repeatCheck(templates, fraction):
  templatesZipped, templatesList, templatesSelector = tee(templates, 3)
  zippedQuarters = map(lambda x: zip(*x), map(list, templatesZipped))
  templates = map(list, templatesList)
  selectors = [1] * sum(1 for _ in templatesSelector)

  for i, e in enumerate(zippedQuarters):
    o = 0
    for n in e:
      repeats = Counter(n)
      del repeats["E"]
      if any(x > 2 for x in repeats.values()):
        selectors[i] = 0
        break
      elif any(x == 2 for x in repeats.values()):
        o += 1
        if o > 1:
          selectors[i] = 0
          break

  return compress(templates, selectors)


if __name__ == "__main__":
  main(sys.argv[1:])
