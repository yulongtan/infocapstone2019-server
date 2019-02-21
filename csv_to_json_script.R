library(rjson)
library(readr)
library(dplyr)
library(jsonlite)
#don't need all of these libraries....

# Read CSV into R
df <- read.csv(file="march-2019-blood-drive-list.csv", header=TRUE, sep=",", stringsAsFactors=FALSE)
#is.data.frame(df)


#write_json(df, "march-blood-drive-data", pretty = TRUE, na = TRUE, auto_unbox = FALSE)
write_json(df, "march-blood-drive-data.json")
#df %>% toJSON() %>% write_lines("march-blood-drive-data")
View(df)
#table <- fromJSON(json)
