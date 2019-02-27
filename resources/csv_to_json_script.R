library(jsonlite)

# Read CSV into R
df <- read.csv(file="march-2019-blood-drive-list.csv", header=TRUE, sep=",", stringsAsFactors=FALSE)

# Writes and exports json file
write_json(df, "march-blood-drive-data.json")
View(df)

