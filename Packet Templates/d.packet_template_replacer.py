import random
import csv
from collections import Counter

# subdistribution definitions
# the big 3 comprise (4) 1/1 subcategories and replace "L", "H", and "S" (balanced by quarters)
literature_subdistribution = ["Literature: American", "Literature: British", "Literature: European", "Literature: World/Other"]
history_subdistribution = ["History: American", "History: European", "History: Other", "History: World"]
science_subdistribution = ["Science: Biology", "Science: Chemistry", "Science: Physics", "Science: Other"]
# fine arts comprises (3) 1/1 subcategories and replaces "E" (balanced by thirds)
fine_arts_subdistribution = ["Fine Arts: Painting and Sculpture", "Fine Arts: Classical Music", "Fine Arts: Other"]
# all other 1/1 categories replace "E" in random order
other_subdistribution = ["Religion", "Mythology", "Philosophy", "Social Science", "Other"]


def random_shuffle_immutable(subdistribution):
  # random.shuffle but instead of being in-place it returns a list, so we can pop() off
  return random.sample(subdistribution, len(subdistribution))


def produce_random_other():
  # produces a shuffled other_subdistribution but checks to make sure RM and PSS aren't adjacent
  random_other = random_shuffle_immutable(other_subdistribution)
  check = list(map(set, zip(random_other, random_other[1:])))
  if {"Religion", "Mythology"} in check or {"Philosophy", "Social Science"} in check:
    random_other = produce_random_other()
  return random_other


randomTemplate = []
with open("random_templates.txt", "r") as f:
  for template in f:
    random_literature = random_shuffle_immutable(literature_subdistribution)
    random_history = random_shuffle_immutable(history_subdistribution)
    random_science = random_shuffle_immutable(science_subdistribution)
    random_fine_arts = random_shuffle_immutable(fine_arts_subdistribution)
    random_other = produce_random_other()
    # list comprehension to replace the big 3
    new_template = [random_literature.pop() if e == "L" else random_history.pop() if e == "H" else random_science.pop() if e == "S" else e for e in list(template.rstrip())]
    # section to replace fine arts & other subcategories, which is slightly more tricky
    # first determine the number of "E"verything in each third
    num_everything_begin = Counter(new_template[0:7])["E"]
    num_everything_middle = Counter(new_template[7:13])["E"]
    num_everything_end = Counter(new_template[13:20])["E"]
    # take a random sample in each third to determine where to place fine arts. offset indices in middle and end third by previous counts of "E"
    fine_arts_begin = random.sample(range(num_everything_begin),1)
    fine_arts_middle = [e + num_everything_begin for e in random.sample(range(num_everything_middle),1)]
    fine_arts_end = [e + num_everything_begin + num_everything_middle for e in random.sample(range(num_everything_end),1)]
    # collect indices in one list for easy processing
    fine_arts_indices = fine_arts_begin + fine_arts_middle + fine_arts_end
    num_everything = 0
    for i, e in enumerate(new_template):
      if e == "E":
        if num_everything in fine_arts_indices:
          new_template[i] = random_fine_arts.pop()
        else:
          # replace all other "E" with random other subcategory
          new_template[i] = random_other.pop()
        num_everything += 1
    randomTemplate.append(new_template)

numberedTemplateFile = open("random_templates_replaced.csv", "w")

for i in range(20):
  tranposedList = [x[i] for x in randomTemplate]
  numberedList = [str(i + 1) + ". " + x for x in tranposedList]
  wr = csv.writer(numberedTemplateFile, dialect="excel")
  wr.writerow(numberedList)
