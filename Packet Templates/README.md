> [!WARNING]
> This repository contains a packet generation script developed in 2017–2019 and used one time, for 2021 Illinois Open. The scripts are not maintained and should not be used. They are superseded by the packet template generation in [qams](../qams) or [qams²](../qams2).

[Generate Packet Templates](./a.generate_packet_templates.py)
* for help, run python .\a.generate_packet_templates.py -h
* otherwise, specify -b quarter or -b half
* creates file "templates.txt" that contains all possible packet templates satisfying balance constraints
* [quarter-balanced templates](./templates.txt) is included in this repository

[Analyze Packet Templates](./b.analyze_packet_templates.py)
* allows you to verify that templates.csv generated a correct output by checking percentage of each category in a question slot
* creates file "templates_analysis.csv"
* [quarter-balanced analysis](./templates_analysis.csv) is included in this repository

[Generate Random Sample](./c.random_sample_packet_templates.py)
* for help, run python .\c.random_sample_packet_templates.py -h
* otherwise, specify -n <number of distributions to produce>

[Place Subdistributions](./d.packet_template_replacer.py)
* run python .\d.packet_template_replacer.py to replace randomly sampled distributions with subdistributions and write to excel-friendly csv for copying/pasting into packets
* adjust lines 5-13 before running to adjust subdistribution